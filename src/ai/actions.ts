import type {AIAction, CustomAction} from "../types";

export const BUILTIN_ACTIONS: AIAction[] = [
];

export function customActionToAIAction(ca: CustomAction): AIAction {
	const template = ca.promptTemplate || "";
	return {
		id: ca.id,
		name: ca.name,
		description: `Custom: ${ca.name}`,
		promptTemplate: template,
		generationType: ca.generationType,
		needsInput: template.includes("{{input}}"),
		usesSelection: template.includes("{{selection}}"),
		icon: ca.icon || "zap",
		outputMode: ca.outputMode,
		triggerMode: ca.triggerMode,
	};
}

export function buildPrompt(template: string, replacements: Record<string, string>): string {
	let result = template;
	for (const [key, value] of Object.entries(replacements)) {
		result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
	}
	return result;
}

export function getAllActions(customActions: CustomAction[]): AIAction[] {
	return [...BUILTIN_ACTIONS, ...customActions.map(customActionToAIAction)];
}
