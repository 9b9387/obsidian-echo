import type {ChatMessage} from "../types";

export interface LLMProvider {
	chat(messages: ChatMessage[]): Promise<string>;
}