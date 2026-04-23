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
	outputMode: "replace" | "cursor" | "nextLine";
	triggerMode: "slash" | "toolbar" | "both";
}

export interface CustomAction {
	id: string;
	name: string;
	promptTemplate: string;
	outputMode: "replace" | "cursor" | "nextLine";
	triggerMode: "slash" | "toolbar" | "both";
	icon: string;
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
