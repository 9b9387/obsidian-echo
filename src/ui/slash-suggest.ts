import {
	Editor,
	EditorPosition,
	EditorSuggest,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from "obsidian";
import type AIPlugin from "../main";
import type {AIAction} from "../types";
import {getAllActions} from "../ai/actions";

export class SlashSuggest extends EditorSuggest<AIAction> {
	plugin: AIPlugin;

	constructor(plugin: AIPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		_file: TFile | null,
	): EditorSuggestTriggerInfo | null {
		const trigger = this.plugin.settings.slashTrigger;
		const line = editor.getLine(cursor.line);
		const beforeCursor = line.slice(0, cursor.ch);

		const escapedTrigger = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const pattern = new RegExp(`^${escapedTrigger}(\\w*)$`);
		const match = beforeCursor.match(pattern);
		if (!match) return null;

		return {
			start: {line: cursor.line, ch: 0},
			end: cursor,
			query: match[1] ?? "",
		};
	}

	getSuggestions(context: EditorSuggestContext): AIAction[] {
		const query = context.query.toLowerCase();
		const allActions = getAllActions(this.plugin.settings.customActions);
		const actions = allActions.filter(a => a.triggerMode === "slash" || a.triggerMode === "both");
		if (!query) return actions;
		return actions.filter(
			a =>
				a.id.toLowerCase().includes(query) ||
				a.name.toLowerCase().includes(query) ||
				a.description.toLowerCase().includes(query),
		);
	}

	renderSuggestion(action: AIAction, el: HTMLElement): void {
		const wrapper = el.createDiv({cls: "ai-suggest-item"});
		const header = wrapper.createDiv({cls: "ai-suggest-item-header"});
		header.createSpan({cls: "ai-suggest-item-name", text: action.name});
		wrapper.createDiv({cls: "ai-suggest-item-desc", text: action.description});
	}

	selectSuggestion(action: AIAction, _evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;

		const {editor} = this.context;
		const {start, end} = this.context;

		editor.replaceRange("", start, end);

		const selection = editor.getSelection() || this.plugin.cachedSelection;
		void this.plugin.executeAction(action, editor, selection);
	}
}
