import {setIcon} from "obsidian";

export interface InlineAskResult {
	question: string;
}

export class InlineAskInput {
	private el: HTMLElement;
	private input: HTMLInputElement;
	private resolvePromise: ((value: InlineAskResult | null) => void) | null = null;
	private contextLabel: HTMLElement;
	private destroyed = false;

	constructor(private parentEl: HTMLElement) {
		this.el = parentEl.createDiv({cls: "ai-inline-ask"});

		const header = this.el.createDiv({cls: "ai-inline-ask-header"});
		const iconWrap = header.createSpan({cls: "ai-inline-ask-icon"});
		setIcon(iconWrap, "pen-line");
		header.createSpan({cls: "ai-inline-ask-title", text: "Echo"});
		this.contextLabel = header.createSpan({cls: "ai-inline-ask-context"});

		const inputRow = this.el.createDiv({cls: "ai-inline-ask-input-row"});

		this.input = inputRow.createEl("input", {
			cls: "ai-inline-ask-input",
			attr: {
				type: "text",
				placeholder: "Describe what to write, or Enter to continue...",
			},
		});

		const submitBtn = inputRow.createEl("button", {
			cls: "ai-inline-ask-submit",
			attr: {"aria-label": "Send"},
		});
		setIcon(submitBtn, "arrow-up");

		const hint = this.el.createDiv({cls: "ai-inline-ask-hint"});
		hint.setText("Enter to write · Esc to cancel");

		this.input.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.submit();
			}
			if (e.key === "Escape") {
				e.preventDefault();
				this.cancel();
			}
		});

		submitBtn.addEventListener("click", () => this.submit());
	}

	setContextLabel(sectionTitle: string): void {
		if (sectionTitle) {
			this.contextLabel.setText(`· ${sectionTitle}`);
		} else {
			this.contextLabel.setText("· Document");
		}
	}

	positionAt(coords: {left: number; top: number; bottom: number}): void {
		const top = coords.bottom + 4;
		let left = coords.left;
		const width = 460;
		if (left + width > window.innerWidth - 20) {
			left = Math.max(20, window.innerWidth - width - 20);
		}
		this.el.setCssProps({
			"--inline-ask-top": `${top}px`,
			"--inline-ask-left": `${left}px`,
		});
	}

	focus(): void {
		setTimeout(() => this.input.focus(), 20);
	}

	private submit(): void {
		const question = this.input.value.trim();
		this.resolvePromise?.({question});
		this.resolvePromise = null;
		this.destroy();
	}

	private cancel(): void {
		this.resolvePromise?.(null);
		this.resolvePromise = null;
		this.destroy();
	}

	waitForInput(): Promise<InlineAskResult | null> {
		return new Promise((resolve) => {
			this.resolvePromise = resolve;
		});
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		this.el.remove();
	}
}
