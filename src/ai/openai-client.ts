import type {ChatMessage} from "../types";
import type {AIPluginSettings} from "../settings";
import type {LLMProvider} from "./provider";
import {yieldFrame} from "./provider";

interface ChatCompletionResponse {
	choices?: {message?: {content?: string}}[];
}

interface ChatCompletionChunk {
	choices?: {delta?: {content?: string}}[];
}

interface APIError {
	error?: {message?: string};
}

export class OpenAIClient implements LLMProvider {
	private settings: AIPluginSettings;

	constructor(settings: AIPluginSettings) {
		this.settings = settings;
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
	}

	async chat(messages: ChatMessage[]): Promise<string> {
		// eslint-disable-next-line no-restricted-globals -- streaming requires native fetch
		const response = await fetch(this.buildUrl(), {
			method: "POST",
			headers: this.buildHeaders(),
			body: JSON.stringify(this.buildBody(messages, false)),
		});

		if (!response.ok) {
			throw await this.parseError(response);
		}

		const data = await response.json() as ChatCompletionResponse;
		return data.choices?.[0]?.message?.content ?? "";
	}

	async streamChat(
		messages: ChatMessage[],
		onChunk: (text: string) => void,
		onDone: () => void,
		onError: (error: Error) => void,
		signal?: AbortSignal,
	): Promise<void> {
		let response: Response;
		try {
			// eslint-disable-next-line no-restricted-globals -- streaming requires native fetch
			response = await fetch(this.buildUrl(), {
				method: "POST",
				headers: this.buildHeaders(),
				body: JSON.stringify(this.buildBody(messages, true)),
				signal,
			});
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			onError(err instanceof Error ? err : new Error(String(err)));
			return;
		}

		if (!response.ok) {
			onError(await this.parseError(response));
			return;
		}

		const reader = response.body?.getReader();
		if (!reader) {
			onError(new Error("Response body is not readable"));
			return;
		}

		const decoder = new TextDecoder();
		let buffer = "";

		try {
			while (true) {
				const {done, value} = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, {stream: true});
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed || !trimmed.startsWith("data:")) continue;

					const data = trimmed.slice(5).trim();
					if (data === "[DONE]") {
						onDone();
						return;
					}

					try {
						const parsed = JSON.parse(data) as ChatCompletionChunk;
						const content = parsed.choices?.[0]?.delta?.content;
						if (content) {
							onChunk(content);
							await yieldFrame();
						}
					} catch {
						// skip malformed JSON lines
					}
				}
			}
			onDone();
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			onError(err instanceof Error ? err : new Error(String(err)));
		} finally {
			reader.releaseLock();
		}
	}

	private buildUrl(): string {
		const base = this.settings.baseUrl.replace(/\/+$/, "");
		return `${base}/chat/completions`;
	}

	private buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.settings.apiKey) {
			headers["Authorization"] = `Bearer ${this.settings.apiKey}`;
		}
		return headers;
	}

	private buildBody(messages: ChatMessage[], stream: boolean): Record<string, unknown> {
		return {
			model: this.settings.model,
			messages,
			temperature: this.settings.temperature,
			max_tokens: this.settings.maxTokens,
			top_p: this.settings.topP,
			frequency_penalty: this.settings.frequencyPenalty,
			presence_penalty: this.settings.presencePenalty,
			stream,
		};
	}

	private async parseError(response: Response): Promise<Error> {
		let message = `API error ${response.status}`;
		try {
			const body = await response.json() as APIError;
			if (body.error?.message) {
				message = `${message}: ${body.error.message}`;
			}
		} catch {
			// body not JSON
		}
		return new Error(message);
	}
}
