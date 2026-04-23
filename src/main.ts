import {Editor, MarkdownView, Menu, Notice, Plugin, TFolder} from "obsidian";
import {AIPluginSettings, AISettingTab, DEFAULT_SETTINGS} from "./settings";
import type {LLMProvider} from "./ai/provider";
import {OpenAIClient} from "./ai/openai-client";
import {GeminiClient} from "./ai/gemini-client";
import {ImageGenerator} from "./ai/image-generator";
import {buildPrompt, BUILTIN_ACTIONS, getAllActions} from "./ai/actions";
import {buildEditorContext, formatContextPrompt, INLINE_ASK_SYSTEM_PROMPT} from "./ai/context-builder";
import {SlashSuggest} from "./ui/slash-suggest";
import {SelectionToolbar} from "./ui/selection-toolbar";
import {GeneratingIndicator} from "./ui/generating-indicator";
import {InlineAskInput} from "./ui/inline-ask";
import {PromptModal} from "./ui/prompt-modal";

import {ImagePromptModal} from "./ui/image-prompt-modal";
import type {AIAction, ChatMessage} from "./types";

export default class AIPlugin extends Plugin {
	settings: AIPluginSettings;
	client: LLMProvider;
	imageGenerator: ImageGenerator;
	cachedSelection = "";
	private statusBarEl: HTMLElement | null = null;
	private selectionToolbar: SelectionToolbar | null = null;
	private generatingIndicator: GeneratingIndicator | null = null;
	private activeInlineAsk: InlineAskInput | null = null;

	async onload() {
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
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.client = this.createClient();
		this.imageGenerator.updateSettings(this.settings);
		this.selectionToolbar?.rebuild();
	}

	private createClient(): LLMProvider {
		if (this.settings.provider === "gemini") {
			return new GeminiClient(this.settings);
		}
		return new OpenAIClient(this.settings);
	}

	async executeAction(action: AIAction, editor: Editor, selection: string): Promise<void> {
		if (typeof selection !== "string" || selection.includes("[object ")) {
			selection = "";
		}

		const hasKey = this.settings.provider === "gemini"
			? this.settings.geminiApiKey
			: this.settings.apiKey;
		if (!hasKey) {
			new Notice("Please set your API key in settings.");
			return;
		}

		if (!selection && action.usesSelection) {
			selection = this.consumeCachedSelection();
		}

		if (action.id === "generate-image") {
			const modal = new ImagePromptModal(this.app, {
				selection: String(selection),
				stylePresets: this.settings.imageStylePresets,
				sizePresets: this.settings.imageSizePresets,
				defaultSize: this.settings.imageSize,
			});
			const imgResult = await modal.waitForInput();
			if (!imgResult) return;

			let finalPrompt = imgResult.prompt;
			if (selection) {
				finalPrompt = `${finalPrompt}\n\nContext: ${selection}`;
			}
			if (imgResult.stylePrompt) {
				finalPrompt = `${finalPrompt}\n\nStyle: ${imgResult.stylePrompt}`;
			}
			await this.executeImageGeneration(editor, finalPrompt, imgResult.sizeValue);
			return;
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

		if (this.settings.systemPrompt) {
			messages.push({role: "system", content: this.settings.systemPrompt});
		}

		messages.push({role: "user", content: promptText});

		let startPos;
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");

		if (action.outputMode === "replace") {
			editor.replaceRange("", from, to);
			startPos = from;
		} else if (action.outputMode === "nextLine") {
			const cursorLine = editor.getLine(to.line);
			const insertPos = {line: to.line, ch: cursorLine.length};
			editor.replaceRange("\n\n", insertPos);
			startPos = {line: insertPos.line + 2, ch: 0};
		} else {
			startPos = to;
		}

		await this.blockGenerate(editor, startPos, messages);
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

	private async executeImageGeneration(editor: Editor, prompt: string, sizeValue?: string): Promise<void> {
		this.setStatus("Generating image...");
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		this.generatingIndicator?.show(view, editor, editor.getCursor());

		try {
			const result = await this.imageGenerator.generate(prompt, sizeValue);

			const folder = this.settings.imageSaveFolder.replace(/\/+$/, "");
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
			const cursor = editor.getCursor();
			editor.replaceRange(`${markdownLink}\n`, cursor);

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
