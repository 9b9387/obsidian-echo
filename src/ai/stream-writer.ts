import type {Editor, EditorPosition} from "obsidian";

export class StreamWriter {
	private editor: Editor;
	private pos: EditorPosition;
	private abortController: AbortController;
	private cancelled = false;
	private onCancel: (() => void) | null = null;
	private escHandler: ((e: KeyboardEvent) => void) | null = null;

	constructor(editor: Editor, startPos: EditorPosition) {
		this.editor = editor;
		this.pos = {...startPos};
		this.abortController = new AbortController();

		this.escHandler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				this.cancel();
			}
		};
		document.addEventListener("keydown", this.escHandler, {capture: true});
	}

	get signal(): AbortSignal {
		return this.abortController.signal;
	}

	get isCancelled(): boolean {
		return this.cancelled;
	}

	write(chunk: string): void {
		if (this.cancelled) return;

		this.editor.replaceRange(chunk, this.pos);

		const lines = chunk.split("\n");
		if (lines.length === 1) {
			this.pos = {line: this.pos.line, ch: this.pos.ch + chunk.length};
		} else {
			const lastLine = lines[lines.length - 1] ?? "";
			this.pos = {
				line: this.pos.line + lines.length - 1,
				ch: lastLine.length,
			};
		}
	}

	cancel(): void {
		if (this.cancelled) return;
		this.cancelled = true;
		this.abortController.abort();
		this.onCancel?.();
		this.cleanup();
	}

	finish(): void {
		this.cleanup();
		this.editor.setCursor(this.pos);
	}

	setOnCancel(fn: () => void): void {
		this.onCancel = fn;
	}

	private cleanup(): void {
		if (this.escHandler) {
			document.removeEventListener("keydown", this.escHandler, {capture: true});
			this.escHandler = null;
		}
	}
}
