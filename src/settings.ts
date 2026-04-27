import * as Obsidian from "obsidian";
import {App, PluginSettingTab, Setting, TextAreaComponent} from "obsidian";
import type AIPlugin from "./main";
import type {CustomAction} from "./types";

export type LLMProviderType = "openai" | "gemini";

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
	// Image LLM
	imageProvider: LLMProviderType;
	imageOpenaiApiKey: string;
	imageOpenaiApiKeySecretName: string;
	imageOpenaiBaseUrl: string;
	imageOpenaiModel: string;
	imageGeminiApiKey: string;
	imageGeminiApiKeySecretName: string;
	imageGeminiBaseUrl: string;
	imageGeminiModel: string;
	// Shared model params
	temperature: number;
	maxTokens: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
	textSystemPrompt: string;
	imageSystemPrompt: string;
	// Image output
	imageSaveFolder: string;
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
	imageProvider: "openai",
	imageOpenaiApiKey: "",
	imageOpenaiApiKeySecretName: "",
	imageOpenaiBaseUrl: "https://api.openai.com/v1",
	imageOpenaiModel: "dall-e-3",
	imageGeminiApiKey: "",
	imageGeminiApiKeySecretName: "",
	imageGeminiBaseUrl: "https://generativelanguage.googleapis.com",
	imageGeminiModel: "gemini-2.0-flash-preview-image-generation",
	imageSaveFolder: "ai-images",
	temperature: 0.7,
	maxTokens: 2048,
	topP: 1,
	frequencyPenalty: 0,
	presencePenalty: 0,
	textSystemPrompt: "You are a helpful writing assistant. Respond in the same language as the user's input unless instructed otherwise.",
	imageSystemPrompt: "",
	streamingEnabled: true,
	customActions: [
		{
			id: "echo",
			name: "Echo",
			promptTemplate: "{{full}}\n\nContinue writing naturally from where the current section ends. Expand on the topic, add detail, and maintain the same structure and depth as sibling sections.",
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
		},
		{
			id: "generate-image",
			name: "Generate image",
			promptTemplate: "{{input}}\n\n{{selection}}",
			generationType: "image",
			outputMode: "nextLine",
			triggerMode: "toolbar",
			icon: "image",
		}
	],
};

export class AISettingTab extends PluginSettingTab {
	plugin: AIPlugin;
	private expandedModelSections: Record<"text" | "image", boolean> = {
		text: true,
		image: false,
	};
	private expandedActionIds: Set<string> = new Set();

	constructor(app: App, plugin: AIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		const modelBox = containerEl.createDiv({cls: "ai-settings-box"});
		new Setting(modelBox).setName("Model settings").setHeading();
		const textSection = this.createModelAccordion(modelBox, "Text generation model", "text");
		this.renderTextModelSection(textSection);
		const imageSection = this.createModelAccordion(modelBox, "Image generation model", "image");
		this.renderImageModelSection(imageSection);
		this.renderCustomActionsSection(containerEl);
	}

	private createModelAccordion(containerEl: HTMLElement, title: string, key: "text" | "image"): HTMLElement {
		const detailsEl = containerEl.createEl("details", {cls: "ai-settings-accordion"});
		if (this.expandedModelSections[key]) {
			detailsEl.setAttr("open", "");
		}
		detailsEl.addEventListener("toggle", () => {
			this.expandedModelSections[key] = detailsEl.open;
		});
		detailsEl.createEl("summary", {
			text: title,
			cls: "ai-settings-accordion-summary",
		});
		return detailsEl.createDiv({cls: "ai-settings-accordion-content"});
	}

	private renderTextModelSection(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Provider")
			.setDesc("Provider used for text generation")
			.addDropdown(dropdown => dropdown
				.addOption("openai", "OpenAI-compatible")
				.addOption("gemini", "Google Gemini")
				.setValue(this.plugin.settings.textProvider)
				.onChange(async (value) => {
					this.plugin.settings.textProvider = value as LLMProviderType;
					await this.plugin.saveSettings();
					this.display();
				}));

		this.renderApiKeyInfo(containerEl, "API key secret", "text", this.plugin.settings.textProvider);

		if (this.plugin.settings.textProvider === "openai") {
			new Setting(containerEl)
				.setName("Base URL")
				.setDesc("Text endpoint for OpenAI-compatible API")
				.addText(text => text
					.setPlaceholder("https://api.openai.com/v1")
					.setValue(this.plugin.settings.textOpenaiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.textOpenaiBaseUrl = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName("Model")
				.setDesc("Text model id")
				.addText(text => text
					.setPlaceholder("gpt-4o-mini")
					.setValue(this.plugin.settings.textOpenaiModel)
					.onChange(async (value) => {
						this.plugin.settings.textOpenaiModel = value;
						await this.plugin.saveSettings();
					}));
		} else {
			new Setting(containerEl)
				.setName("Base URL")
				.setDesc("Text endpoint for Gemini API")
				.addText(text => text
					.setPlaceholder("https://generativelanguage.googleapis.com")
					.setValue(this.plugin.settings.textGeminiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.textGeminiBaseUrl = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName("Model")
				.setDesc("Gemini text model id")
				.addText(text => text
					.setPlaceholder("gemini-2.5-flash")
					.setValue(this.plugin.settings.textGeminiModel)
					.onChange(async (value) => {
						this.plugin.settings.textGeminiModel = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("System prompt used for text generation")
			.addTextArea((text: TextAreaComponent) => {
				text
					.setPlaceholder("You are a helpful assistant...")
					.setValue(this.plugin.settings.textSystemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.textSystemPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
				text.inputEl.cols = 50;
			});
	}

	private renderImageModelSection(containerEl: HTMLElement): void {
		new Setting(containerEl)
			.setName("Provider")
			.setDesc("Provider used for image generation")
			.addDropdown(dropdown => dropdown
				.addOption("openai", "OpenAI-compatible")
				.addOption("gemini", "Google Gemini")
				.setValue(this.plugin.settings.imageProvider)
				.onChange(async (value) => {
					this.plugin.settings.imageProvider = value as LLMProviderType;
					await this.plugin.saveSettings();
					this.display();
				}));

		this.renderApiKeyInfo(containerEl, "API key secret", "image", this.plugin.settings.imageProvider);

		if (this.plugin.settings.imageProvider === "openai") {
			new Setting(containerEl)
				.setName("Base URL")
				.setDesc("Image endpoint for OpenAI-compatible API")
				.addText(text => text
					.setPlaceholder("https://api.openai.com/v1")
					.setValue(this.plugin.settings.imageOpenaiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.imageOpenaiBaseUrl = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName("Image model")
				.setDesc("OpenAI image model id")
				.addText(text => text
					.setPlaceholder("dall-e-3")
					.setValue(this.plugin.settings.imageOpenaiModel)
					.onChange(async (value) => {
						this.plugin.settings.imageOpenaiModel = value;
						await this.plugin.saveSettings();
					}));
		} else {
			new Setting(containerEl)
				.setName("Base URL")
				.setDesc("Image endpoint for Gemini API")
				.addText(text => text
					.setPlaceholder("https://generativelanguage.googleapis.com")
					.setValue(this.plugin.settings.imageGeminiBaseUrl)
					.onChange(async (value) => {
						this.plugin.settings.imageGeminiBaseUrl = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName("Image model")
				.setDesc("Gemini image model id")
				.addText(text => text
					.setPlaceholder("gemini-2.0-flash-preview-image-generation")
					.setValue(this.plugin.settings.imageGeminiModel)
					.onChange(async (value) => {
						this.plugin.settings.imageGeminiModel = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName("Image save folder")
			.setDesc("Folder in vault to save generated images")
			.addText(text => text
				.setPlaceholder("ai-images")
				.setValue(this.plugin.settings.imageSaveFolder)
				.onChange(async (value) => {
					this.plugin.settings.imageSaveFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("Instruction prefix for image prompt composition")
			.addTextArea((text: TextAreaComponent) => {
				text
					.setPlaceholder("You are an image prompt assistant...")
					.setValue(this.plugin.settings.imageSystemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.imageSystemPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 3;
				text.inputEl.cols = 50;
			});
	}

	private renderApiKeyInfo(
		containerEl: HTMLElement,
		title: string,
		target: "text" | "image",
		provider: "openai" | "gemini",
	): void {
		new Setting(containerEl)
			.setName(title)
			.setDesc("Select or create a secret in Obsidian Secret Storage")
			.then(setting => {
				this.addSecretSelector(setting, target, provider);
			});
	}

	private addSecretSelector(setting: Setting, target: "text" | "image", provider: "openai" | "gemini"): void {
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
				.onChange(async (value: string) => {
					this.setSecretNameByTarget(target, provider, value ?? "");
					await this.plugin.saveSettings();
				});
			return component;
		});
	}

	private getSecretNameByTarget(target: "text" | "image", provider: "openai" | "gemini"): string {
		if (target === "text") {
			return provider === "openai"
				? this.plugin.settings.textOpenaiApiKeySecretName
				: this.plugin.settings.textGeminiApiKeySecretName;
		}
		return provider === "openai"
			? this.plugin.settings.imageOpenaiApiKeySecretName
			: this.plugin.settings.imageGeminiApiKeySecretName;
	}

	private setSecretNameByTarget(target: "text" | "image", provider: "openai" | "gemini", value: string): void {
		if (target === "text") {
			if (provider === "openai") {
				this.plugin.settings.textOpenaiApiKeySecretName = value;
			} else {
				this.plugin.settings.textGeminiApiKeySecretName = value;
			}
			return;
		}
		if (provider === "openai") {
			this.plugin.settings.imageOpenaiApiKeySecretName = value;
		} else {
			this.plugin.settings.imageGeminiApiKeySecretName = value;
		}
	}

	private renderCustomActionsSection(containerEl: HTMLElement): void {
		const actionBox = containerEl.createDiv({cls: "ai-settings-box"});
		new Setting(actionBox).setName("Actions config").setHeading();

		const actions = this.plugin.settings.customActions;

		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]!;
			const idx = i;
			const detailsEl = actionBox.createEl("details", {cls: "ai-settings-accordion"});
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
			const summaryLabel = action.name.trim() || "(Unnamed Action)";
			detailsEl.createEl("summary", {
				text: `${summaryLabel} · ${action.generationType} · ${action.triggerMode} · ${action.outputMode}`,
				cls: "ai-settings-accordion-summary",
			});
			const wrapper = detailsEl.createDiv({cls: "ai-settings-accordion-content ai-custom-action-item"});

			new Setting(wrapper)
				.setName("Action name")
				.addText(text => text
					.setPlaceholder("Action name")
					.setValue(action.name)
					.onChange(async (value) => {
						action.name = value;
						await this.plugin.saveSettings();
					}))
				.addExtraButton(btn => btn
					.setIcon("trash")
					.setTooltip("Delete action")
					.onClick(async () => {
						actions.splice(idx, 1);
							this.expandedActionIds.delete(action.id);
						await this.plugin.saveSettings();
						this.display();
					}));

			new Setting(wrapper)
				.setName("Trigger method")
				.setDesc("Where to show this command")
				.addDropdown(dropdown => dropdown
					.addOption("slash", "Slash command only")
					.addOption("toolbar", "Selection toolbar only")
					.addOption("both", "Both slash and toolbar")
					.setValue(action.triggerMode)
					.onChange(async (value) => {
						const newMode = value as "slash" | "toolbar" | "both";
						action.triggerMode = newMode;
						if (action.generationType === "image") {
							action.outputMode = "nextLine";
						}
						if (newMode === "slash" && action.generationType === "text") {
							action.outputMode = "cursor";
						}
						await this.plugin.saveSettings();
						this.display();
					}));

			new Setting(wrapper)
				.setName("Generation type")
				.setDesc("Text generation or image generation")
				.addDropdown(dropdown => dropdown
					.addOption("text", "Text")
					.addOption("image", "Image")
					.setValue(action.generationType)
					.onChange(async (value) => {
						action.generationType = value as "text" | "image";
							if (action.generationType === "image") {
								action.outputMode = "nextLine";
						}
						await this.plugin.saveSettings();
						this.display();
					}));

			if (action.triggerMode !== "slash") {
				const iconDesc = document.createDocumentFragment();
				iconDesc.appendText("Lucide icon name. Find icons at ");
				iconDesc.createEl("a", { text: "lucide.dev/icons", href: "https://lucide.dev/icons/" });

				new Setting(wrapper)
					.setName("Icon")
					.setDesc(iconDesc)
					.addText(text => text
						.setPlaceholder("zap")
						.setValue(action.icon || "zap")
						.onChange(async (value) => {
							action.icon = value;
							await this.plugin.saveSettings();
						}));

				if (action.generationType === "text") {
					new Setting(wrapper)
						.setName("Output mode")
						.setDesc("How to insert AI output")
						.addDropdown(dropdown => dropdown
							.addOption("replace", "Replace selection")
							.addOption("cursor", "Insert at cursor")
							.addOption("nextLine", "Insert at next line")
							.setValue(action.outputMode)
							.onChange(async (value) => {
								action.outputMode = value as "replace" | "cursor" | "nextLine";
								await this.plugin.saveSettings();
							}));
				} else {
					new Setting(wrapper)
						.setName("Output mode")
						.setDesc("Image actions always insert at next line (fixed)")
						.addText(text => text
							.setValue("nextLine")
							.setDisabled(true));
					action.outputMode = "nextLine";
				}
			}

			let placeholdersDesc = "Placeholders: {{selection}}, {{outline}}, {{section}}, {{full}}, {{input}}.";
			if (action.triggerMode === "slash") {
				placeholdersDesc = "Placeholders: {{outline}}, {{section}}, {{full}}, {{input}}. (Slash does not support {{selection}})";
			} else if (action.triggerMode === "toolbar") {
				placeholdersDesc = "Placeholders: {{selection}}, {{outline}}, {{section}}, {{full}}. (Toolbar does not support {{input}})";
			}

			new Setting(wrapper)
				.setName("Prompt template")
				.setDesc(placeholdersDesc)
				.addTextArea((text: TextAreaComponent) => {
					text
						.setPlaceholder("Translate the following text to English:\n\n{{selection}}")
						.setValue(action.promptTemplate)
						.onChange(async (value) => {
							action.promptTemplate = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.rows = 3;
					text.inputEl.cols = 50;
				});
		}

		new Setting(actionBox)
			.addButton(btn => btn
				.setButtonText("Add action")
				.setCta()
				.onClick(async () => {
					const newAction = {
						id: "custom-" + Date.now(),
						name: "",
						promptTemplate: "",
						generationType: "text",
						outputMode: "nextLine",
						triggerMode: "both",
						icon: "zap",
					} as const;
					actions.push(newAction);
					this.expandedActionIds.add(newAction.id);
					await this.plugin.saveSettings();
					this.display();
				}));
	}
}
