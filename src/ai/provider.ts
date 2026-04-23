import type {ChatMessage} from "../types";

export interface LLMProvider {
	chat(messages: ChatMessage[]): Promise<string>;

	streamChat(
		messages: ChatMessage[],
		onChunk: (text: string) => void,
		onDone: () => void,
		onError: (error: Error) => void,
		signal?: AbortSignal,
	): Promise<void>;
}

export function yieldFrame(): Promise<void> {
	return new Promise<void>(resolve => {
		requestAnimationFrame(() => resolve());
	});
}
