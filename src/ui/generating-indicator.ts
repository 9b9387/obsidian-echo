import {setIcon} from "obsidian";

export class GeneratingIndicator {
	private el: HTMLElement;
	private textEl: HTMLElement;
	private cancelBtn: HTMLElement;
	private onCancelFn: (() => void) | null = null;

	constructor() {
		this.el = document.body.createDiv({cls: "ai-generating-indicator ai-hidden"});

		const spinner = this.el.createDiv({cls: "ai-generating-spinner"});
		spinner.createDiv({cls: "ai-spinner-dot"});

		this.textEl = this.el.createSpan({cls: "ai-generating-text", text: "Generating..."});

		this.cancelBtn = this.el.createEl("button", {cls: "ai-generating-cancel"});
		setIcon(this.cancelBtn, "x");
		const hint = this.cancelBtn.createSpan({text: "Esc"});
		hint.addClass("ai-generating-cancel-hint");

		this.cancelBtn.addEventListener("click", () => {
			this.onCancelFn?.();
		});
	}

	show(onCancel: () => void): void {
		this.onCancelFn = onCancel;
		this.textEl.setText("Generating...");
		this.el.removeClass("ai-hidden");
		this.el.removeClass("ai-generating-done");
	}

	showDone(): void {
		this.textEl.setText("Done");
		this.el.addClass("ai-generating-done");
		this.cancelBtn.addClass("ai-hidden");
		setTimeout(() => this.hide(), 1500);
	}

	showCancelled(): void {
		this.textEl.setText("Cancelled");
		this.el.addClass("ai-generating-done");
		this.cancelBtn.addClass("ai-hidden");
		setTimeout(() => this.hide(), 1500);
	}

	showError(message: string): void {
		const display = message.length > 50 ? message.slice(0, 50) + "..." : message;
		this.textEl.setText(`Error: ${display}`);
		this.el.addClass("ai-generating-done");
		this.cancelBtn.addClass("ai-hidden");
		setTimeout(() => this.hide(), 3000);
	}

	hide(): void {
		this.el.addClass("ai-hidden");
		this.cancelBtn.removeClass("ai-hidden");
		this.onCancelFn = null;
	}

	destroy(): void {
		this.el.remove();
	}
}
