import type {AIAction, CustomAction} from "../types";

export const BUILTIN_ACTIONS: AIAction[] = [
	{
		id: "echo",
		name: "Echo",
		description: "AI writes or continues content based on context",
		promptTemplate: "",
		needsInput: false,
		usesSelection: false,
		icon: "sparkles",
	},
	{
		id: "translate",
		name: "Translate",
		description: "Translate text to another language",
		promptTemplate: "Translate the following text. If no target language is specified by the user, translate to English. Preserve the original formatting.\n\n{{selection}}",
		needsInput: false,
		usesSelection: true,
		icon: "languages",
	},
	{
		id: "generate-image",
		name: "Generate image",
		description: "Generate an image from text description",
		promptTemplate: "{{input}}\n\n{{selection}}",
		needsInput: true,
		usesSelection: true,
		icon: "image",
	},
];

export function customActionToAIAction(ca: CustomAction): AIAction {
	return {
		id: ca.id,
		name: ca.name,
		description: `Custom: ${ca.name}`,
		promptTemplate: ca.promptTemplate,
		needsInput: ca.promptTemplate.includes("{{input}}"),
		usesSelection: ca.promptTemplate.includes("{{selection}}"),
		icon: "zap",
	};
}

export function buildPrompt(template: string, selection: string, input: string): string {
	return template
		.replace(/\{\{selection}}/g, selection)
		.replace(/\{\{input}}/g, input);
}

export function getAllActions(customActions: CustomAction[]): AIAction[] {
	return [...BUILTIN_ACTIONS, ...customActions.map(customActionToAIAction)];
}
