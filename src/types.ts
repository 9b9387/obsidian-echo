export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface AIAction {
	id: string;
	name: string;
	description: string;
	promptTemplate: string;
	needsInput: boolean;
	usesSelection: boolean;
	icon: string;
}

export interface CustomAction {
	id: string;
	name: string;
	promptTemplate: string;
}

export interface ImageStylePreset {
	id: string;
	name: string;
	prompt: string;
}

export interface ImageSizePreset {
	id: string;
	name: string;
	value: string;
}
