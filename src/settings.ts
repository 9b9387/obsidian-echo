import * as Obsidian from "obsidian";
import {App, PluginSettingTab, Setting, TextAreaComponent} from "obsidian";
import {getSettingsText, type SettingsText} from "./i18n";
import type AIPlugin from "./main";
import type {CustomAction} from "./types";

export type LLMProviderType = "openai" | "gemini";

export const DEFAULT_TEXT_SYSTEM_PROMPT = "You are a helpful writing assistant.";

export interface AIPluginSettings {
	// Text LLM
	textProvider: LLMProviderType;
	textOpenaiApiKey: string;
	textOpenaiApiKeySecretName: string;
	textOpenaiBaseUrl: string;
	textOpenaiModel: string;
	textGeminiApiKey: string;
	textGeminiApiKeySecretName: string;
	textGeminiBaseUrl: string;
	textGeminiModel: string;
	textGeminiTopK: number;
	// Shared model params
	temperature: number;
	maxTokens: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
	streamingEnabled: boolean;
	customActions: CustomAction[];
}

export const DEFAULT_SETTINGS: AIPluginSettings = {
	textProvider: "openai",
	textOpenaiApiKey: "",
	textOpenaiApiKeySecretName: "",
	textOpenaiBaseUrl: "https://api.openai.com/v1",
	textOpenaiModel: "gpt-4o-mini",
	textGeminiApiKey: "",
	textGeminiApiKeySecretName: "",
	textGeminiBaseUrl: "https://generativelanguage.googleapis.com",
	textGeminiModel: "gemini-2.5-flash",
	textGeminiTopK: 40,
	temperature: 0.7,
	maxTokens: 2048,
	topP: 1,
	frequencyPenalty: 0,
	presencePenalty: 0,
	streamingEnabled: true,
	customActions: [
		{
			id: "echo",
			name: "Echo",
			promptTemplate: "{{full}}\n\nContinue writing naturally from where the current section ends. Expand on the topic, add detail, and maintain the same structure and depth as sibling sections.\n\n{{input}}",
			generationType: "text",
			outputMode: "nextLine",
			triggerMode: "both",
			icon: "sparkles",
		},
		{
			id: "translate",
			name: "Translate",
			promptTemplate: "Translate the following text. If no target language is specified by the user, translate to English. Preserve the original formatting.\n\n{{selection}}",
			generationType: "text",
			outputMode: "replace",
			triggerMode: "both",
			icon: "languages",
		}
	],
};

export class AISettingTab extends PluginSettingTab {
	plugin: AIPlugin;
	private expandedActionIds = new Set<string>();

	constructor(app: App, plugin: AIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		const text = getSettingsText();
		containerEl.empty();
		containerEl.addClass("ai-settings");

		const contentEl = containerEl.createDiv({cls: "ai-settings-content"});

		new Setting(contentEl)
			.setName(text.model)
			.setDesc(text.modelDesc)
			.setHeading();
		const modelGroup = contentEl.createDiv({cls: "ai-settings-group"});
		this.renderTextModelSection(modelGroup, text);

		new Setting(contentEl)
			.setName(text.actions)
			.setDesc(text.actionsDesc)
			.setHeading()
			.addButton(btn => btn
				.setButtonText(text.addAction)
				.setCta()
				.onClick(() => {
					this.addAction();
				}));
		const actionsGroup = contentEl.createDiv({cls: "ai-settings-group"});
		this.renderCustomActionsSection(actionsGroup, text);
	}

	private renderTextModelSection(containerEl: HTMLElement, text: SettingsText): void {
		new Setting(containerEl)
			.setName(text.provider)
			.setDesc(text.providerDesc)
			.addDropdown(dropdown => dropdown
				.addOption("openai", text.openaiCompatible)
				.addOption("gemini", text.googleGemini)
				.setValue(this.plugin.settings.textProvider)
				.onChange(async (value) => {
					this.plugin.settings.textProvider = value as LLMProviderType;
					await this.plugin.saveSettings();
					this.display();
				}));

		this.renderApiKeyInfo(containerEl, text.apiKeySecret, "text", this.plugin.settings.textProvider, text);

		if (this.plugin.settings.textProvider === "openai") {
			new Setting(containerEl)
				.setName(text.baseUrl)
				.setDesc(text.openaiBaseUrlDesc)
				.addText(input => input
					.setPlaceholder("https://api.openai.com/v1")
					.setValue(this.plugin.settings.textOpenaiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.textOpenaiBaseUrl = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(text.modelId)
				.setDesc(text.openaiModelDesc)
				.addText(input => input
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder("gpt-4o-mini")
					.setValue(this.plugin.settings.textOpenaiModel)
					.onChange(async (value) => {
						this.plugin.settings.textOpenaiModel = value;
						await this.plugin.saveSettings();
					}));
		} else {
			new Setting(containerEl)
				.setName(text.baseUrl)
				.setDesc(text.geminiBaseUrlDesc)
				.addText(input => input
					.setPlaceholder("https://generativelanguage.googleapis.com")
					.setValue(this.plugin.settings.textGeminiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.textGeminiBaseUrl = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName(text.modelId)
				.setDesc(text.geminiModelDesc)
				.addText(input => input
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder("gemini-2.5-flash")
					.setValue(this.plugin.settings.textGeminiModel)
					.onChange(async (value) => {
						this.plugin.settings.textGeminiModel = value;
						await this.plugin.saveSettings();
					}));
		}
	}

	private renderApiKeyInfo(
		containerEl: HTMLElement,
		title: string,
		target: "text",
		provider: "openai" | "gemini",
		text: SettingsText,
	): void {
		new Setting(containerEl)
			.setName(title)
			.setDesc(text.apiKeySecretDesc)
			.then(setting => {
				this.addSecretSelector(setting, target, provider);
			});
	}

	private addSecretSelector(setting: Setting, target: "text", provider: "openai" | "gemini"): void {
		type SecretComponentLike = {
			setValue(value: string): SecretComponentLike;
			onChange(callback: (value: string) => void): SecretComponentLike;
		};

		const settingWithComponent = setting as unknown as {
			addComponent?: (cb: (el: HTMLElement) => SecretComponentLike) => Setting;
			controlEl: HTMLElement;
		};

		const secretName = this.getSecretNameByTarget(target, provider);

		const SecretComponentCtor = (Obsidian as unknown as {
			SecretComponent?: new (app: App, containerEl: HTMLElement) => SecretComponentLike;
		}).SecretComponent;

		settingWithComponent.addComponent!((el: HTMLElement) => {
			const component = new SecretComponentCtor!(this.app, el);
			component
				.setValue(secretName)
				.onChange((value: string) => {
					void (async () => {
						this.setSecretNameByTarget(target, provider, value ?? "");
						await this.plugin.saveSettings();
					})();
				});
			return component;
		});
	}

	private getSecretNameByTarget(target: "text", provider: "openai" | "gemini"): string {
		return provider === "openai"
			? this.plugin.settings.textOpenaiApiKeySecretName
			: this.plugin.settings.textGeminiApiKeySecretName;
	}

	private setSecretNameByTarget(target: "text", provider: "openai" | "gemini", value: string): void {
		if (provider === "openai") {
			this.plugin.settings.textOpenaiApiKeySecretName = value;
		} else {
			this.plugin.settings.textGeminiApiKeySecretName = value;
		}
	}

	private renderCustomActionsSection(containerEl: HTMLElement, text: SettingsText): void {
		const actions = this.plugin.settings.customActions;

		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]!;
			const idx = i;
			const wrapper = this.createActionPanel(containerEl, action, async (enabled) => {
				action.enabled = enabled;
				await this.plugin.saveSettings();
			}, async () => {
				actions.splice(idx, 1);
				await this.plugin.saveSettings();
				this.display();
			});

			new Setting(wrapper)
				.setName(text.actionName)
				.setDesc(text.actionNameDesc)
				.addText(input => input
					.setPlaceholder(text.actionNamePlaceholder)
					.setValue(action.name)
					.onChange(async (value) => {
						action.name = value;
						await this.plugin.saveSettings();
					}));

			new Setting(wrapper)
				.setName(text.triggerMethod)
				.setDesc(text.triggerMethodDesc)
				.addDropdown(dropdown => dropdown
					.addOption("slash", text.slashOnly)
					.addOption("toolbar", text.toolbarOnly)
					.addOption("both", text.bothSlashToolbar)
					.setValue(action.triggerMode)
					.onChange(async (value) => {
						const newMode = value as "slash" | "toolbar" | "both";
						action.triggerMode = newMode;
						if (newMode === "slash") {
							action.outputMode = "cursor";
						}
						this.expandedActionIds.add(action.id);
						await this.plugin.saveSettings();
						this.display();
					}));

			if (action.triggerMode !== "slash") {
				const iconDesc = document.createDocumentFragment();
				iconDesc.appendText(text.iconDescPrefix);
				iconDesc.createEl("a", {
					text: text.iconDescLink,
					href: "https://lucide.dev/icons/",
				});
				iconDesc.appendText(text.iconDescSuffix);

				new Setting(wrapper)
					.setName(text.icon)
					.setDesc(iconDesc)
					.addText(input => input
						// eslint-disable-next-line obsidianmd/ui/sentence-case
						.setPlaceholder("zap")
						.setValue(action.icon || "zap")
						.onChange(async (value) => {
							action.icon = value;
							await this.plugin.saveSettings();
						}));

				new Setting(wrapper)
					.setName(text.outputMode)
					.setDesc(text.outputModeDesc)
					.addDropdown(dropdown => dropdown
						.addOption("replace", text.replaceSelection)
						.addOption("cursor", text.insertAtCursor)
						.addOption("nextLine", text.insertAtNextLine)
						.setValue(action.outputMode)
						.onChange((value) => {
							action.outputMode = value as "replace" | "cursor" | "nextLine";
							void this.plugin.saveSettings();
						}));
			}

			let placeholdersDesc = text.placeholdersAll;
			if (action.triggerMode === "slash") {
				placeholdersDesc = text.placeholdersSlash;
			} else if (action.triggerMode === "toolbar") {
				placeholdersDesc = text.placeholdersToolbar;
			}

			new Setting(wrapper)
				.setName(text.promptTemplate)
				.setDesc(placeholdersDesc)
				.addTextArea((textarea: TextAreaComponent) => {
					textarea
						.setPlaceholder(this.getPromptPlaceholder(action.triggerMode, text))
						.setValue(action.promptTemplate)
						.onChange(async (value) => {
							action.promptTemplate = value;
							await this.plugin.saveSettings();
						});
					textarea.inputEl.rows = 6;
					textarea.inputEl.cols = 50;
				});
		}

	}

	private addAction(): void {
		this.plugin.settings.customActions.push({
			id: "custom-" + Date.now(),
			name: "",
			enabled: true,
			promptTemplate: "",
			generationType: "text",
			outputMode: "nextLine",
			triggerMode: "both",
			icon: "zap",
		});
		void this.plugin.saveSettings().then(() => this.display());
	}

	private createActionPanel(
		containerEl: HTMLElement,
		action: CustomAction,
		onEnabledChange: (enabled: boolean) => Promise<void>,
		onDelete: () => Promise<void>,
	): HTMLElement {
		const detailsEl = containerEl.createEl("details", {cls: "ai-action-panel"});
		if (this.expandedActionIds.has(action.id)) {
			detailsEl.setAttr("open", "");
		}
		detailsEl.addEventListener("toggle", () => {
			if (detailsEl.open) {
				this.expandedActionIds.add(action.id);
			} else {
				this.expandedActionIds.delete(action.id);
			}
		});

		const summaryEl = detailsEl.createEl("summary", {cls: "ai-action-summary"});
		summaryEl.createSpan({
			cls: "ai-action-name",
			text: action.name.trim() || getSettingsText().unnamedAction,
		});

		const metaEl = summaryEl.createDiv({cls: "ai-action-meta"});
		const text = getSettingsText();
		metaEl.createSpan({text: this.formatTriggerMode(action.triggerMode, text)});
		metaEl.createSpan({text: this.formatOutputMode(action.outputMode, text)});

		const toggleEl = summaryEl.createDiv({cls: "ai-action-toggle"});
		const toggle = new Obsidian.ToggleComponent(toggleEl);
		toggle
			.setValue(action.enabled !== false)
			.onChange((enabled) => {
				void onEnabledChange(enabled);
			});
		const stopSummaryToggle = (event: Event) => {
			event.stopPropagation();
		};
		toggleEl.addEventListener("pointerdown", stopSummaryToggle, {capture: true});
		toggleEl.addEventListener("mousedown", stopSummaryToggle, {capture: true});
		toggleEl.addEventListener("click", stopSummaryToggle, {capture: true});

		const deleteButton = summaryEl.createEl("button", {cls: "clickable-icon ai-action-delete"});
		deleteButton.setAttr("type", "button");
		deleteButton.setAttr("aria-label", text.deleteAction);
		deleteButton.setAttr("title", text.deleteAction);
		Obsidian.setIcon(deleteButton, "trash");
		deleteButton.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			void onDelete();
		});

		return detailsEl.createDiv({cls: "ai-action-body"});
	}

	private formatTriggerMode(mode: CustomAction["triggerMode"], text: SettingsText): string {
		if (mode === "slash") return text.metaSlash;
		if (mode === "toolbar") return text.metaToolbar;
		return text.metaBoth;
	}

	private formatOutputMode(mode: CustomAction["outputMode"], text: SettingsText): string {
		if (mode === "replace") return text.metaReplace;
		if (mode === "cursor") return text.metaCursor;
		return text.metaNextLine;
	}

	private getPromptPlaceholder(mode: CustomAction["triggerMode"], text: SettingsText): string {
		if (mode === "slash") {
			return text.placeholderSlash;
		}
		if (mode === "toolbar") {
			return text.placeholderToolbar;
		}
		return text.placeholderBoth;
	}
}
