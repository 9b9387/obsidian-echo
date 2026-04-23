import {App, Modal} from "obsidian";

function safeString(value: unknown): string {
	if (typeof value !== "string") return "";
	if (value.includes("[object ")) return "";
	return value;
}

export class PromptModal extends Modal {
	private result: string | null = null;
	private resolvePromise: ((value: string | null) => void) | null = null;
	private selection: string;
	private title: string;
	private placeholder: string;

	constructor(
		app: App,
		opts: {title?: string; placeholder?: string; selection?: unknown} = {},
	) {
		super(app);
		this.title = opts.title ?? "Enter prompt";
		this.placeholder = opts.placeholder ?? "Describe what you want AI to do...";
		this.selection = safeString(opts.selection);
	}

	onOpen(): void {
		const {contentEl} = this;
		contentEl.addClass("ai-prompt-modal");

		contentEl.createEl("h3", {text: this.title});

		if (this.selection) {
			const preview = contentEl.createDiv({cls: "ai-prompt-selection-preview"});
			preview.createEl("label", {text: "Selected text:"});
			const displayText = this.selection.length > 200
				? this.selection.slice(0, 200) + "…"
				: this.selection;
			preview.createEl("pre", {text: displayText});
		}

		const textarea = contentEl.createEl("textarea", {
			cls: "ai-prompt-input",
			attr: {
				placeholder: this.placeholder,
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
		hint.setText("Ctrl/Cmd + Enter to submit");

		setTimeout(() => textarea.focus(), 10);
	}

	private submit(value: string): void {
		const trimmed = value.trim();
		if (!trimmed) return;
		this.result = trimmed;
		this.close();
	}

	onClose(): void {
		this.contentEl.empty();
		this.resolvePromise?.(this.result);
	}

	waitForInput(): Promise<string | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
			this.open();
		});
	}
}
