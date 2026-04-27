import {App, Editor, MarkdownView, Menu, Notice, Plugin, TFolder, normalizePath} from "obsidian";
import {AIPluginSettings, AISettingTab, DEFAULT_SETTINGS} from "./settings";
import type {LLMProvider} from "./ai/provider";
import {OpenAIClient} from "./ai/openai-client";
import {GeminiClient} from "./ai/gemini-client";
import {ImageGenerator} from "./ai/image-generator";
import {buildPrompt, getAllActions} from "./ai/actions";
import {buildEditorContext, formatContextPrompt, INLINE_ASK_SYSTEM_PROMPT} from "./ai/context-builder";
import {SlashSuggest} from "./ui/slash-suggest";
import {SelectionToolbar} from "./ui/selection-toolbar";
import {GeneratingIndicator} from "./ui/generating-indicator";
import {InlineAskInput} from "./ui/inline-ask";
import {PromptModal} from "./ui/prompt-modal";
import type {AIAction, ChatMessage, GenerationType} from "./types";

type SecretStorageLike = {
	getSecret(id: string): string | null;
};

type GenerationContext = {
	editor: Editor;
	action: AIAction;
	promptText: string;
	startPos: {line: number; ch: number};
};

export default class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	client: LLMProvider;
	imageGenerator: ImageGenerator;
	private generationHandlers: Record<GenerationType, (ctx: GenerationContext) => Promise<void>>;
	cachedSelection = "";
	private statusBarEl: HTMLElement | null = null;
	private selectionToolbar: SelectionToolbar | null = null;
	private generatingIndicator: GeneratingIndicator | null = null;
	private activeInlineAsk: InlineAskInput | null = null;

	constructor(app: App, manifest: Plugin["manifest"]) {
		super(app, manifest);
		this.generationHandlers = {
			text: async (ctx) => this.executeTextGeneration(ctx),
			image: async (ctx) => this.executeImageGeneration(ctx.editor, ctx.promptText, ctx.startPos),
		};
	}

	async onload() {
		if (!this.hasSecretStorage()) {
			throw new Error("Obsidian SecretStorage is required. Please use Obsidian 1.11.4 or newer.");
		}

		await this.loadSettings();
		this.client = this.createClient();
		this.imageGenerator = new ImageGenerator(this.settings);

		this.statusBarEl = this.addStatusBarItem();
		this.statusBarEl.setText("");

		this.selectionToolbar = new SelectionToolbar(this);
		this.generatingIndicator = new GeneratingIndicator();

		this.registerEditorSuggest(new SlashSuggest(this));

		this.addSettingTab(new AISettingTab(this.app, this));

		this.registerCommands();
		this.registerContextMenu();
		this.registerSelectionTracker();
	}

	onunload() {
		this.selectionToolbar?.destroy();
		this.generatingIndicator?.destroy();
		this.activeInlineAsk?.destroy();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData() as Partial<AIPluginSettings>,
		);
		this.hydrateApiKeysFromSecretStorage();
		await this.saveData(this.getPersistedSettings());
		// Model tuning parameters are intentionally fixed to defaults.
		this.settings.temperature = DEFAULT_SETTINGS.temperature;
		this.settings.maxTokens = DEFAULT_SETTINGS.maxTokens;
		this.settings.topP = DEFAULT_SETTINGS.topP;
		this.settings.frequencyPenalty = DEFAULT_SETTINGS.frequencyPenalty;
		this.settings.presencePenalty = DEFAULT_SETTINGS.presencePenalty;
		this.settings.textGeminiTopK = DEFAULT_SETTINGS.textGeminiTopK;
	}

	async saveSettings() {
		this.hydrateApiKeysFromSecretStorage();
		await this.saveData(this.getPersistedSettings());
		this.client = this.createClient();
		this.imageGenerator.updateSettings(this.settings);
		this.selectionToolbar?.rebuild();
	}

	hasSecretStorage(): boolean {
		return this.getSecretStorage() !== null;
	}

	private getPersistedSettings(): AIPluginSettings {
		return {
			...this.settings,
			textOpenaiApiKey: "",
			textGeminiApiKey: "",
			imageOpenaiApiKey: "",
			imageGeminiApiKey: "",
		};
	}

	private getSecretStorage(): SecretStorageLike | null {
		const appWithSecretStorage = this.app as typeof this.app & {secretStorage?: SecretStorageLike};
		return appWithSecretStorage.secretStorage ?? null;
	}

	private hydrateApiKeysFromSecretStorage(): void {
		const storage = this.getSecretStorage();
		if (!storage) {
			throw new Error("Obsidian SecretStorage is required. Please use Obsidian 1.11.4 or newer.");
		}

		const textOpenAiSecret = this.settings.textOpenaiApiKeySecretName?.trim();
		const textGeminiSecret = this.settings.textGeminiApiKeySecretName?.trim();
		const imageOpenAiSecret = this.settings.imageOpenaiApiKeySecretName?.trim();
		const imageGeminiSecret = this.settings.imageGeminiApiKeySecretName?.trim();

		this.settings.textOpenaiApiKey = textOpenAiSecret ? (storage.getSecret(textOpenAiSecret) ?? "") : "";
		this.settings.textGeminiApiKey = textGeminiSecret ? (storage.getSecret(textGeminiSecret) ?? "") : "";
		this.settings.imageOpenaiApiKey = imageOpenAiSecret ? (storage.getSecret(imageOpenAiSecret) ?? "") : "";
		this.settings.imageGeminiApiKey = imageGeminiSecret ? (storage.getSecret(imageGeminiSecret) ?? "") : "";
	}

	private createClient(): LLMProvider {
		if (this.settings.textProvider === "gemini") {
			return new GeminiClient(this.settings);
		}
		return new OpenAIClient(this.settings);
	}

	async executeAction(action: AIAction, editor: Editor, selection: string): Promise<void> {
		if (typeof selection !== "string" || selection.includes("[object ")) {
			selection = "";
		}

		if (!selection && action.usesSelection) {
			selection = this.consumeCachedSelection();
		}

		let userInput = "";
		let promptText = "";
		const messages: ChatMessage[] = [];
		const needsContext = action.promptTemplate.includes("{{outline}}") || action.promptTemplate.includes("{{section}}") || action.promptTemplate.includes("{{full}}");

		let ctx: any = null;

		if (needsContext) {
			this.activeInlineAsk?.destroy();
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) return;
			const cursor = editor.getCursor();
			ctx = buildEditorContext(editor);

			if (action.needsInput) {
				const inlineInput = new InlineAskInput(document.body);
				this.activeInlineAsk = inlineInput;
				inlineInput.setContextLabel(ctx.sectionTitle);
				const offset = editor.posToOffset(cursor);
				const cmEditor = (view.editor as unknown as {cm: {coordsAtPos: (pos: number) => {left: number; right: number; top: number; bottom: number} | null}}).cm;
				const coords = cmEditor?.coordsAtPos(offset);
				if (coords) {
					inlineInput.positionAt(coords);
				}
				inlineInput.focus();
				const result = await inlineInput.waitForInput();
				this.activeInlineAsk = null;
				if (!result) return;
				userInput = result.question;
			}
		} else {
			if (action.needsInput) {
				const modal = new PromptModal(this.app, {
					title: action.name,
					selection: action.usesSelection ? selection : undefined,
				});
				const result = await modal.waitForInput();
				if (result === null) return;
				userInput = result;
			}
		}

		if (action.usesSelection && !selection) {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				const cursor = view.editor.getCursor();
				const line = view.editor.getLine(cursor.line);
				selection = line;
			}
		}

		let fullContext = "";
		if (ctx) {
			const parts = ["<document_context>"];
			if (ctx.outline) parts.push(`<outline>\n${ctx.outline}\n</outline>`);
			if (ctx.sectionContent) parts.push(`<current_section>\n${ctx.sectionContent}\n</current_section>`);
			if (ctx.siblingContent) parts.push(`<sibling_sections_for_style_reference>\n${ctx.siblingContent}\n</sibling_sections_for_style_reference>`);
			parts.push("</document_context>");
			fullContext = parts.join("\n\n");
		}

		promptText = buildPrompt(action.promptTemplate, {
			selection,
			input: userInput,
			outline: ctx?.outline ?? "",
			section: ctx?.sectionContent ?? "",
			full: fullContext
		});

		const generationType = action.generationType;
		const hasKey = generationType === "image"
			? this.hasImageApiKey()
			: this.hasTextApiKey();
		if (!hasKey) {
			new Notice(`Missing ${generationType} API key secret. Configure it in model settings.`);
			return;
		}

		const startPos = this.resolveInsertPosition(
			editor,
			generationType === "image" ? "nextLine" : action.outputMode,
		);
		await this.generationHandlers[generationType]({
			editor,
			action,
			promptText,
			startPos,
		});
	}

	private hasTextApiKey(): boolean {
		return this.settings.textProvider === "gemini"
			? Boolean(this.settings.textGeminiApiKey)
			: Boolean(this.settings.textOpenaiApiKey);
	}

	private hasImageApiKey(): boolean {
		return this.settings.imageProvider === "gemini"
			? Boolean(this.settings.imageGeminiApiKey)
			: Boolean(this.settings.imageOpenaiApiKey);
	}

	private async executeTextGeneration(ctx: GenerationContext): Promise<void> {
		const messages: ChatMessage[] = [];
		if (this.settings.textSystemPrompt) {
			messages.push({role: "system", content: this.settings.textSystemPrompt});
		}
		messages.push({role: "user", content: ctx.promptText});
		await this.blockGenerate(ctx.editor, ctx.startPos, messages);
	}

	private resolveInsertPosition(
		editor: Editor,
		outputMode: "replace" | "cursor" | "nextLine",
	): {line: number; ch: number} {
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");
		if (outputMode === "replace") {
			editor.replaceRange("", from, to);
			return from;
		}
		if (outputMode === "nextLine") {
			const cursorLine = editor.getLine(to.line);
			const insertPos = {line: to.line, ch: cursorLine.length};
			editor.replaceRange("\n\n", insertPos);
			return {line: insertPos.line + 2, ch: 0};
		}
		return to;
	}

	private async blockGenerate(
		editor: Editor,
		startPos: {line: number; ch: number},
		messages: ChatMessage[],
	): Promise<void> {
		this.setStatus("AI generating...");
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.generatingIndicator?.show(view, editor, startPos);

		try {
			const result = await this.client.chat(messages);
			editor.replaceRange(result, startPos);
			this.setStatus("Done");
			this.generatingIndicator?.showDone();
			setTimeout(() => this.setStatus(""), 2000);
		} catch (err: unknown) {
			this.setStatus("");
			const msg = err instanceof Error ? err.message : String(err);
			this.generatingIndicator?.showError(msg);
			new Notice(`AI error: ${msg}`);
		}
	}

	private async executeImageGeneration(
		editor: Editor,
		prompt: string,
		insertPos?: {line: number; ch: number},
	): Promise<void> {
		this.setStatus("Generating image...");
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.generatingIndicator?.show(view, editor, editor.getCursor());

		try {
			const finalPrompt = this.settings.imageSystemPrompt
				? `${this.settings.imageSystemPrompt}\n\n${prompt}`
				: prompt;
			const result = await this.imageGenerator.generate(finalPrompt);

			const folder = normalizePath(this.settings.imageSaveFolder);
			const existing = this.app.vault.getAbstractFileByPath(folder);
			if (!existing) {
				await this.app.vault.createFolder(folder);
			} else if (!(existing instanceof TFolder)) {
				throw new Error(`"${folder}" exists but is not a folder`);
			}

			const timestamp = Date.now();
			const filename = `ai-image-${timestamp}.${result.extension}`;
			const filePath = `${folder}/${filename}`;

			await this.app.vault.createBinary(filePath, result.data);

			const markdownLink = `![](${filePath})`;
			const targetPos = insertPos ?? editor.getCursor();
			editor.replaceRange(`${markdownLink}\n`, targetPos);

			this.setStatus("Done");
			this.generatingIndicator?.showDone();
			new Notice("Image generated and inserted.");
			setTimeout(() => this.setStatus(""), 2000);
		} catch (err: unknown) {
			this.setStatus("");
			const msg = err instanceof Error ? err.message : String(err);
			this.generatingIndicator?.showError(msg);
			new Notice(`Image generation error: ${msg}`);
		}
	}

	private setStatus(text: string): void {
		if (this.statusBarEl) {
			this.statusBarEl.setText(text);
		}
	}

	private registerCommands(): void {
		const allActions = getAllActions(this.settings.customActions);
		for (const action of allActions) {
			this.addCommand({
				id: `ai-action-${action.id}`,
				name: action.name,
				editorCallback: (editor: Editor) => {
					void this.executeAction(action, editor, editor.getSelection());
				},
			});
		}
	}

	consumeCachedSelection(): string {
		const sel = this.cachedSelection;
		this.cachedSelection = "";
		return sel;
	}

	private registerSelectionTracker(): void {
		this.registerDomEvent(document, "selectionchange", () => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view) {
				this.selectionToolbar?.hide();
				return;
			}

			const sel = view.editor.getSelection();
			if (sel && typeof sel === "string" && !sel.includes("[object ")) {
				this.cachedSelection = sel;
				const domSel = window.getSelection();
				if (domSel && domSel.rangeCount > 0) {
					const range = domSel.getRangeAt(0);
					const rect = range.getBoundingClientRect();
					if (rect.width > 0) {
						this.selectionToolbar?.scheduleShow(rect, sel);
					}
				}
			} else {
				this.selectionToolbar?.clearHandledSelection();
				this.selectionToolbar?.hide();
			}
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				this.cachedSelection = "";
				this.selectionToolbar?.clearHandledSelection();
				this.selectionToolbar?.hide();
			}),
		);
	}

	private registerContextMenu(): void {
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
				const selection = editor.getSelection();
				if (!selection) return;

				const allActions = getAllActions(this.settings.customActions);
				for (const action of allActions) {
					if (action.usesSelection && (action.triggerMode === "toolbar" || action.triggerMode === "both")) {
						menu.addItem((item) => {
							item.setTitle(action.name).setIcon(action.icon).onClick(() => {
								void this.executeAction(action, editor, selection);
							});
						});
					}
				}
			}),
		);
	}
}
