import {MarkdownView, setIcon} from "obsidian";
import type AIPlugin from "../main";
import {BUILTIN_ACTIONS} from "../ai/actions";
import type {AIAction} from "../types";

const TOOLBAR_ACTIONS = ["echo", "translate", "generate-image"];
const SHOW_DELAY = 350;

export class SelectionToolbar {
	private el: HTMLElement;
	private plugin: AIPlugin;
	private visible = false;
	private showTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(plugin: AIPlugin) {
		this.plugin = plugin;
		this.el = document.body.createDiv({cls: "ai-selection-toolbar ai-hidden"});
		this.buildButtons();
	}

	private buildButtons(): void {
		for (const actionId of TOOLBAR_ACTIONS) {
			const action = BUILTIN_ACTIONS.find(a => a.id === actionId);
			if (!action) continue;
			this.addButton(action);
		}
	}

	private addButton(action: AIAction): void {
		const btn = this.el.createEl("button", {
			cls: "ai-toolbar-btn",
			attr: {"aria-label": action.name},
		});
		setIcon(btn, action.icon);

		btn.addEventListener("mousedown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.onActionClick(action);
		});
	}

	private onActionClick(action: AIAction): void {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		const editor = view.editor;
		const selection = editor.getSelection();
		if (!selection) return;

		this.hide();
		void this.plugin.executeAction(action, editor, selection);
	}

	updatePosition(rect: DOMRect): void {
		const toolbarWidth = this.el.offsetWidth;
		const toolbarHeight = this.el.offsetHeight;

		let top = rect.bottom + 6;
		let left = rect.left + (rect.width - toolbarWidth) / 2;

		if (top + toolbarHeight > window.innerHeight - 4) {
			top = rect.top - toolbarHeight - 6;
		}
		left = Math.max(4, Math.min(left, window.innerWidth - toolbarWidth - 4));

		this.el.setCssProps({
			"--toolbar-top": `${top}px`,
			"--toolbar-left": `${left}px`,
		});
	}

	show(rect: DOMRect): void {
		this.cancelShow();
		this.el.removeClass("ai-hidden");
		this.updatePosition(rect);
		this.visible = true;
	}

	hide(): void {
		this.cancelShow();
		this.el.addClass("ai-hidden");
		this.visible = false;
	}

	scheduleShow(rect: DOMRect): void {
		if (this.visible) {
			this.updatePosition(rect);
			return;
		}
		this.cancelShow();
		this.showTimer = setTimeout(() => {
			this.show(rect);
		}, SHOW_DELAY);
	}

	private cancelShow(): void {
		if (this.showTimer) {
			clearTimeout(this.showTimer);
			this.showTimer = null;
		}
	}

	get isVisible(): boolean {
		return this.visible;
	}

	destroy(): void {
		this.cancelShow();
		this.el.remove();
	}
}
