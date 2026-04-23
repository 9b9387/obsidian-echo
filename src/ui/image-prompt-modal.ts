import {App, Modal, Setting} from "obsidian";
import type {ImageStylePreset, ImageSizePreset} from "../types";

const SELECTION_PREVIEW_LIMIT = 200;

function cleanSelection(value: unknown): string {
	if (value == null) return "";
	const s = String(value);
	if (s === "undefined" || s === "null" || s === "[object Object]") return "";
	if (s.includes("[object ")) return "";
	return s.trim();
}

export interface ImagePromptResult {
	prompt: string;
	stylePrompt: string;
	sizeValue: string;
}

export class ImagePromptModal extends Modal {
	private result: ImagePromptResult | null = null;
	private resolvePromise: ((value: ImagePromptResult | null) => void) | null = null;
	private _selectionText: string;
	private stylePresets: ImageStylePreset[];
	private sizePresets: ImageSizePreset[];
	private selectedStyle: string;
	private selectedSize: string;

	constructor(
		app: App,
		opts: {
			selection?: unknown;
			stylePresets: ImageStylePreset[];
			sizePresets: ImageSizePreset[];
			defaultSize?: string;
		},
	) {
		super(app);
		this._selectionText = cleanSelection(opts.selection);
		this.stylePresets = Array.isArray(opts.stylePresets) ? opts.stylePresets : [];
		this.sizePresets = Array.isArray(opts.sizePresets) ? opts.sizePresets : [];
		this.selectedStyle = this.stylePresets[0]?.prompt ?? "";
		this.selectedSize = opts.defaultSize ?? this.sizePresets[0]?.value ?? "1024x1024";
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.addClass("ai-prompt-modal");
		contentEl.addClass("ai-image-prompt-modal");

		contentEl.createEl("h3", {text: "Generate image"});

		const selText = cleanSelection(this._selectionText);
		if (selText.length > 0) {
			const preview = contentEl.createDiv({cls: "ai-prompt-selection-preview"});
			preview.createEl("label", {text: "Selected text:"});
			const displayText = selText.length > SELECTION_PREVIEW_LIMIT
				? selText.slice(0, SELECTION_PREVIEW_LIMIT) + "…"
				: selText;
			const pre = preview.createEl("pre");
			pre.textContent = displayText;
		}

		if (this.stylePresets.length > 0) {
			new Setting(contentEl)
				.setName("Style")
				.addDropdown(dropdown => {
					for (const preset of this.stylePresets) {
						dropdown.addOption(preset.prompt, preset.name);
					}
					dropdown.setValue(this.selectedStyle);
					dropdown.onChange((value) => {
						this.selectedStyle = value;
					});
				});
		}

		if (this.sizePresets.length > 0) {
			new Setting(contentEl)
				.setName("Size")
				.addDropdown(dropdown => {
					for (const preset of this.sizePresets) {
						dropdown.addOption(preset.value, preset.name);
					}
					dropdown.setValue(this.selectedSize);
					dropdown.onChange((value) => {
						this.selectedSize = value;
					});
				});
		}

		const textarea = contentEl.createEl("textarea", {
			cls: "ai-prompt-input",
			attr: {
				placeholder: "Describe the image you want to generate...",
				rows: "4",
			},
		});

		textarea.addEventListener("keydown", (e: KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				this.submit(textarea.value);
			}
			if (e.key === "Escape") {
				this.close();
			}
		});

		const buttonRow = contentEl.createDiv({cls: "ai-prompt-buttons"});

		const cancelBtn = buttonRow.createEl("button", {text: "Cancel"});
		cancelBtn.addEventListener("click", () => this.close());

		const submitBtn = buttonRow.createEl("button", {
			text: "Generate",
			cls: "mod-cta",
		});
		submitBtn.addEventListener("click", () => this.submit(textarea.value));

		const hint = contentEl.createDiv({cls: "ai-prompt-hint"});
		hint.setText("Ctrl/Cmd + Enter to generate");

		setTimeout(() => textarea.focus(), 10);
	}

	private submit(value: string): void {
		const trimmed = value.trim();
		if (!trimmed) return;
		this.result = {
			prompt: trimmed,
			stylePrompt: this.selectedStyle,
			sizeValue: this.selectedSize,
		};
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolvePromise?.(this.result);
	}

	waitForInput(): Promise<ImagePromptResult | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}
}
