import {App, PluginSettingTab, Setting, TextAreaComponent} from "obsidian";
import type AIPlugin from "./main";
import type {CustomAction, ImageStylePreset, ImageSizePreset} from "./types";

export type LLMProviderType = "openai" | "gemini";

export interface AIPluginSettings {
	provider: LLMProviderType;
	// OpenAI-compatible
	apiKey: string;
	baseUrl: string;
	model: string;
	// Gemini
	geminiApiKey: string;
	geminiBaseUrl: string;
	geminiModel: string;
	geminiTopK: number;
	// Shared model params
	temperature: number;
	maxTokens: number;
	topP: number;
	frequencyPenalty: number;
	presencePenalty: number;
	// Image generation
	imageModel: string;
	imageSize: string;
	imageSaveFolder: string;
	geminiImageModel: string;
	imageStylePresets: ImageStylePreset[];
	imageSizePresets: ImageSizePreset[];
	// Behavior
	systemPrompt: string;
	slashTrigger: string;
	streamingEnabled: boolean;
	customActions: CustomAction[];
}

export const DEFAULT_SETTINGS: AIPluginSettings = {
	provider: "openai",
	apiKey: "",
	baseUrl: "https://api.openai.com/v1",
	model: "gpt-4o-mini",
	geminiApiKey: "",
	geminiBaseUrl: "https://generativelanguage.googleapis.com",
	geminiModel: "gemini-2.5-flash",
	geminiTopK: 40,
	imageModel: "dall-e-3",
	imageSize: "1024x1024",
	imageSaveFolder: "ai-images",
	geminiImageModel: "gemini-2.0-flash-preview-image-generation",
	imageStylePresets: [
		{id: "none", name: "None", prompt: ""},
		{id: "photorealistic", name: "Photorealistic", prompt: "photorealistic, high detail, professional photography, 8k resolution"},
		{id: "illustration", name: "Illustration", prompt: "digital illustration, clean vector art style, vivid colors"},
		{id: "watercolor", name: "Watercolor", prompt: "watercolor painting style, soft edges, delicate color blending"},
		{id: "oil-painting", name: "Oil painting", prompt: "oil painting style, rich textures, classical fine art"},
		{id: "pixel-art", name: "Pixel art", prompt: "pixel art style, retro game aesthetic, 16-bit"},
		{id: "anime", name: "Anime", prompt: "anime style, Japanese animation, cel-shaded"},
		{id: "minimalist", name: "Minimalist", prompt: "minimalist design, clean lines, simple geometric shapes, flat colors"},
	],
	imageSizePresets: [
		{id: "square", name: "Square (1024×1024)", value: "1024x1024"},
		{id: "portrait", name: "Portrait (1024×1792)", value: "1024x1792"},
		{id: "landscape", name: "Landscape (1792×1024)", value: "1792x1024"},
	],
	temperature: 0.7,
	maxTokens: 2048,
	topP: 1,
	frequencyPenalty: 0,
	presencePenalty: 0,
	systemPrompt: "You are a helpful writing assistant. Respond in the same language as the user's input unless instructed otherwise.",
	slashTrigger: "/",
	streamingEnabled: true,
	customActions: [
		{
			id: "echo",
			name: "Echo",
			promptTemplate: "{{full}}\n\nContinue writing naturally from where the current section ends. Expand on the topic, add detail, and maintain the same structure and depth as sibling sections.",
			outputMode: "nextLine",
			triggerMode: "both",
			icon: "sparkles",
		},
		{
			id: "translate",
			name: "Translate",
			promptTemplate: "Translate the following text. If no target language is specified by the user, translate to English. Preserve the original formatting.\n\n{{selection}}",
			outputMode: "replace",
			triggerMode: "both",
			icon: "languages",
		}
	],
};

export class AISettingTab extends PluginSettingTab {
	plugin: AIPlugin;
	editingActions: Set<string> = new Set();

	constructor(app: App, plugin: AIPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		this.renderProviderSection(containerEl);

		if (this.plugin.settings.provider === "openai") {
			this.renderOpenAISection(containerEl);
		} else {
			this.renderGeminiSection(containerEl);
		}

		this.renderImageSection(containerEl);
		this.renderBehaviorSection(containerEl);
		this.renderCustomActionsSection(containerEl);
	}

	private renderProviderSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Provider").setHeading();

		new Setting(containerEl)
			.setName("LLM provider")
			.setDesc("Choose the AI service to use")
			.addDropdown(dropdown => dropdown
				.addOption("openai", "OpenAI-compatible")
				.addOption("gemini", "Google Gemini")
				.setValue(this.plugin.settings.provider)
				.onChange(async (value) => {
					this.plugin.settings.provider = value as LLMProviderType;
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private renderOpenAISection(containerEl: HTMLElement): void {
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Setting(containerEl).setName("OpenAI-compatible configuration").setHeading();

		new Setting(containerEl)
			.setName("API key")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Your OpenAI-compatible API key")
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder("sk-...")
				.setValue(this.plugin.settings.apiKey)
				.then(t => t.inputEl.type = "password")
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Base URL")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("API endpoint (OpenAI, Azure, Ollama, DeepSeek, etc.)")
			.addText(text => text
				.setPlaceholder("https://api.openai.com/v1")
				.setValue(this.plugin.settings.baseUrl)
				.onChange(async (value) => {
					this.plugin.settings.baseUrl = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Model")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Model identifier (e.g. gpt-4o-mini, deepseek-chat)")
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder("gpt-4o-mini")
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));
	}

	private renderGeminiSection(containerEl: HTMLElement): void {
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		new Setting(containerEl).setName("Google Gemini configuration").setHeading();

		new Setting(containerEl)
			.setName("API key")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Your Google AI Studio API key")
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder("AIza...")
				.setValue(this.plugin.settings.geminiApiKey)
				.then(t => t.inputEl.type = "password")
				.onChange(async (value) => {
					this.plugin.settings.geminiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Model")
			// eslint-disable-next-line obsidianmd/ui/sentence-case
			.setDesc("Gemini model (e.g. gemini-2.5-flash, gemini-2.5-pro)")
			.addText(text => text
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setPlaceholder("gemini-2.5-flash")
				.setValue(this.plugin.settings.geminiModel)
				.onChange(async (value) => {
					this.plugin.settings.geminiModel = value;
					await this.plugin.saveSettings();
				}));

	}

	private renderImageSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Image generation").setHeading();

		if (this.plugin.settings.provider === "openai") {
			new Setting(containerEl)
				.setName("Image model")
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setDesc("DALL-E model for image generation")
				.addText(text => text
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder("dall-e-3")
					.setValue(this.plugin.settings.imageModel)
					.onChange(async (value) => {
						this.plugin.settings.imageModel = value;
						await this.plugin.saveSettings();
					}));
		} else {
			new Setting(containerEl)
				.setName("Image model")
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				.setDesc("Gemini model for image generation")
				.addText(text => text
					// eslint-disable-next-line obsidianmd/ui/sentence-case
					.setPlaceholder("gemini-2.0-flash-preview-image-generation")
					.setValue(this.plugin.settings.geminiImageModel)
					.onChange(async (value) => {
						this.plugin.settings.geminiImageModel = value;
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

		this.renderStylePresets(containerEl);
		this.renderSizePresets(containerEl);
	}

	private renderStylePresets(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Style presets").setHeading();

		containerEl.createEl("p", {
			text: "Style presets are appended to the image prompt to control visual style.",
			cls: "setting-item-description",
		});

		const presets = this.plugin.settings.imageStylePresets;

		for (let i = 0; i < presets.length; i++) {
			const preset = presets[i]!;
			const idx = i;
			const wrapper = containerEl.createDiv({cls: "ai-custom-action-item"});

			new Setting(wrapper)
				.setName(`Style: ${preset.name || "(unnamed)"}`)
				.addText(text => text
					.setPlaceholder("Preset name")
					.setValue(preset.name)
					.onChange(async (value) => {
						preset.name = value;
						preset.id = value.toLowerCase().replace(/\s+/g, "-") || ("style-" + Date.now());
						await this.plugin.saveSettings();
					}))
				.addExtraButton(btn => btn
					.setIcon("trash")
					.setTooltip("Delete preset")
					.onClick(async () => {
						presets.splice(idx, 1);
						await this.plugin.saveSettings();
						this.display();
					}));

			new Setting(wrapper)
				.setName("Style prompt")
				.setDesc("Keywords appended to your image description")
				.addTextArea((text: TextAreaComponent) => {
					text
						.setPlaceholder("e.g. watercolor painting style, soft colors")
						.setValue(preset.prompt)
						.onChange(async (value) => {
							preset.prompt = value;
							await this.plugin.saveSettings();
						});
					text.inputEl.rows = 2;
					text.inputEl.cols = 50;
				});
		}

		new Setting(containerEl)
			.addButton(btn => btn
				.setButtonText("Add style")
				.setCta()
				.onClick(async () => {
					presets.push({
						id: "style-" + Date.now(),
						name: "",
						prompt: "",
					});
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private renderSizePresets(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Size presets").setHeading();

		containerEl.createEl("p", {
			text: "Size presets define available image dimensions when generating images.",
			cls: "setting-item-description",
		});

		const presets = this.plugin.settings.imageSizePresets;

		for (let i = 0; i < presets.length; i++) {
			const preset = presets[i]!;
			const idx = i;

			new Setting(containerEl)
				.setName(`Size: ${preset.name || "(unnamed)"}`)
				.addText(text => text
					.setPlaceholder("Display name")
					.setValue(preset.name)
					.onChange(async (value) => {
						preset.name = value;
						await this.plugin.saveSettings();
					}))
				.addText(text => text
					.setPlaceholder("1024x1024")
					.setValue(preset.value)
					.onChange(async (value) => {
						preset.value = value;
						preset.id = value.toLowerCase().replace(/[^a-z0-9]/g, "-") || ("size-" + Date.now());
						await this.plugin.saveSettings();
					}))
				.addExtraButton(btn => btn
					.setIcon("trash")
					.setTooltip("Delete preset")
					.onClick(async () => {
						presets.splice(idx, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
		}

		new Setting(containerEl)
			.addButton(btn => btn
				.setButtonText("Add size")
				.setCta()
				.onClick(async () => {
					presets.push({
						id: "size-" + Date.now(),
						name: "",
						value: "",
					});
					await this.plugin.saveSettings();
					this.display();
				}));
	}

	private renderBehaviorSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Behavior").setHeading();

		new Setting(containerEl)
			.setName("System prompt")
			.setDesc("Global system prompt sent with every request")
			.addTextArea((text: TextAreaComponent) => {
				text
					.setPlaceholder("You are a helpful assistant...")
					.setValue(this.plugin.settings.systemPrompt)
					.onChange(async (value) => {
						this.plugin.settings.systemPrompt = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.rows = 4;
				text.inputEl.cols = 50;
			});

		new Setting(containerEl)
			.setName("Slash trigger")
			.setDesc("Character that triggers the AI command menu at the beginning of a line")
			.addText(text => text
				.setPlaceholder("/")
				.setValue(this.plugin.settings.slashTrigger)
				.onChange(async (value) => {
					if (value.length > 0) {
						this.plugin.settings.slashTrigger = value;
						await this.plugin.saveSettings();
					}
				}));
	}

	private renderCustomActionsSection(containerEl: HTMLElement): void {
		new Setting(containerEl).setName("Custom actions").setHeading();

		containerEl.createEl("p", {
			text: "Add custom AI actions that appear in the slash menu and command palette.",
			cls: "setting-item-description",
		});

		const actions = this.plugin.settings.customActions;

		for (let i = 0; i < actions.length; i++) {
			const action = actions[i]!;
			const idx = i;
			const wrapper = containerEl.createDiv({cls: "ai-custom-action-item"});

			const isEditing = this.editingActions.has(action.id);

			if (!isEditing) {
				// Summary View
				const summarySetting = new Setting(wrapper)
					.setName(action.name || "(Unnamed Action)")
					.setDesc(`Trigger: ${action.triggerMode} | Output: ${action.outputMode}`);

				summarySetting.addButton(btn => btn
					.setIcon("pencil")
					.setTooltip("Edit action")
					.onClick(() => {
						this.editingActions.add(action.id);
						this.display();
					}));

				summarySetting.addExtraButton(btn => btn
					.setIcon("trash")
					.setTooltip("Delete action")
					.onClick(async () => {
						actions.splice(idx, 1);
						await this.plugin.saveSettings();
						this.display();
					}));
			} else {
				// Editing View
				new Setting(wrapper)
					.setName(`Action Name`)
					.addText(text => text
						.setPlaceholder("Action name")
						.setValue(action.name)
						.onChange(async (value) => {
							action.name = value;
							action.id = "custom-" + value.toLowerCase().replace(/\s+/g, "-");
							await this.plugin.saveSettings();
						}))
					.addExtraButton(btn => btn
						.setIcon("trash")
						.setTooltip("Delete action")
						.onClick(async () => {
							actions.splice(idx, 1);
							this.editingActions.delete(action.id);
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
						.setValue(action.triggerMode || "both")
						.onChange(async (value) => {
							const newMode = value as "slash" | "toolbar" | "both";
							action.triggerMode = newMode;
							if (newMode === "slash") {
								action.outputMode = "cursor";
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

					new Setting(wrapper)
						.setName("Output mode")
						.setDesc("How to insert AI output")
						.addDropdown(dropdown => dropdown
							.addOption("replace", "Replace selection")
							.addOption("cursor", "Insert at cursor")
							.addOption("nextLine", "Insert at next line")
							.setValue(action.outputMode || "nextLine")
							.onChange(async (value) => {
								action.outputMode = value as "replace" | "cursor" | "nextLine";
								await this.plugin.saveSettings();
							}));
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

				new Setting(wrapper)
					.addButton(btn => btn
						.setButtonText("Save action")
						.setCta()
						.onClick(() => {
							if (!action.name.trim()) {
								import("obsidian").then(({Notice}) => new Notice("Action name cannot be empty."));
								return;
							}
							this.editingActions.delete(action.id);
							this.display();
						}));
			}
		}

		new Setting(containerEl)
			.addButton(btn => btn
				.setButtonText("Add action")
				.setCta()
				.onClick(async () => {
					const newAction = {
						id: "custom-" + Date.now(),
						name: "",
						promptTemplate: "",
						outputMode: "nextLine",
						triggerMode: "both",
						icon: "zap",
					} as const;
					actions.push(newAction);
					this.editingActions.add(newAction.id);
					await this.plugin.saveSettings();
					this.display();
				}));
	}
}
