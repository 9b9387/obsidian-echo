export type GenerationType = "text" | "image";

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface AIAction {
	id: string;
	name: string;
	description: string;
	promptTemplate: string;
	generationType: GenerationType;
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
	generationType: GenerationType;
	outputMode: "replace" | "cursor" | "nextLine";
	triggerMode: "slash" | "toolbar" | "both";
	icon: string;
}
