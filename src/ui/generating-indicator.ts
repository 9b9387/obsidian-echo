import {MarkdownView, Editor} from "obsidian";

export class GeneratingIndicator {
	private el: HTMLElement;
	private textEl: HTMLElement;
	private trackingPos: { view: MarkdownView; editor: Editor; pos: { line: number, ch: number } } | null = null;
	private trackFrame: number | null = null;

	constructor() {
		this.el = document.createElement("div");
		this.el.className = "ai-generating-indicator ai-hidden";

		const spinner = this.el.createDiv({cls: "ai-generating-spinner"});
		spinner.createDiv({cls: "ai-spinner-dot"});

		this.textEl = this.el.createSpan({cls: "ai-generating-text", text: "Generating..."});
	}

	show(view: MarkdownView | null, editor: Editor | null, pos: {line: number, ch: number} | null): void {
		this.textEl.setText("Generating...");
		this.el.removeClass("ai-hidden");
		this.el.removeClass("ai-generating-done");

		if (view && editor && pos) {
			this.trackingPos = { view, editor, pos };
			document.body.appendChild(this.el);
			this.el.style.position = 'fixed';
			this.el.style.top = '0';
			this.el.style.left = '0';
			this.updatePosition(view, editor, pos);

			if (!this.trackFrame) {
				this.trackFrame = requestAnimationFrame(this.trackPosition);
			}
		} else {
			document.body.appendChild(this.el);
			this.el.style.position = 'fixed';
			this.el.style.top = 'auto';
			this.el.style.left = 'auto';
			this.el.style.bottom = '40px';
			this.el.style.right = '16px';
			this.el.style.display = 'flex';
		}
	}

	private trackPosition = () => {
		if (!this.trackingPos) return;
		this.updatePosition(this.trackingPos.view, this.trackingPos.editor, this.trackingPos.pos);
		this.trackFrame = requestAnimationFrame(this.trackPosition);
	};

	private updatePosition(view: MarkdownView, editor: Editor, pos: {line: number, ch: number}) {
		try {
			const offset = editor.posToOffset(pos);
			const cmEditor = (view.editor as any).cm;
			const coords = cmEditor?.coordsAtPos(offset);
			
			if (coords) {
				const top = coords.bottom;
				const left = coords.left;

				const width = this.el.offsetWidth || 150;
				const maxLeft = window.innerWidth - width - 16;
				const boundedLeft = Math.min(Math.max(16, left), maxLeft);

				this.el.style.transform = `translate(${boundedLeft}px, ${top}px)`;
				this.el.style.display = 'flex';
			} else {
				this.el.style.display = 'none';
			}
		} catch (e) {
			// Ignore positioning errors
		}
	}

	showDone(): void {
		this.hide();
	}

	showError(message: string): void {
		const display = message.length > 50 ? message.slice(0, 50) + "..." : message;
		this.textEl.setText(`Error: ${display}`);
		this.el.addClass("ai-generating-done");
		setTimeout(() => this.hide(), 3000);
	}

	hide(): void {
		this.el.addClass("ai-hidden");
		if (this.trackFrame) {
			cancelAnimationFrame(this.trackFrame);
			this.trackFrame = null;
		}
		this.trackingPos = null;
		if (this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
	}

	destroy(): void {
		this.hide();
		this.el.remove();
	}
}
