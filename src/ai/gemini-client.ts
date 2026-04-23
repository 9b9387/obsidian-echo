import type {ChatMessage} from "../types";
import type {AIPluginSettings} from "../settings";
import type {LLMProvider} from "./provider";
import {yieldFrame} from "./provider";

interface GeminiResponse {
	candidates?: {content?: {parts?: {text?: string}[]}}[];
	error?: {message?: string};
}

export class GeminiClient implements LLMProvider {
	private settings: AIPluginSettings;

	constructor(settings: AIPluginSettings) {
		this.settings = settings;
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
	}

	async chat(messages: ChatMessage[]): Promise<string> {
		// eslint-disable-next-line no-restricted-globals -- streaming requires native fetch
		const response = await fetch(this.buildUrl(false), {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify(this.buildBody(messages)),
		});

		if (!response.ok) {
			throw await this.parseError(response);
		}

		const data = await response.json() as GeminiResponse;
		return this.extractText(data);
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
			response = await fetch(this.buildUrl(true), {
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify(this.buildBody(messages)),
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
					if (!data) continue;

					try {
						const parsed = JSON.parse(data) as GeminiResponse;
						const text = this.extractText(parsed);
						if (text) {
							onChunk(text);
							await yieldFrame();
						}
					} catch {
						// skip malformed JSON
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

	private buildUrl(stream: boolean): string {
		const base = this.settings.geminiBaseUrl.replace(/\/+$/, "");
		const model = this.settings.geminiModel;
		const action = stream ? "streamGenerateContent" : "generateContent";
		const params = new URLSearchParams({key: this.settings.geminiApiKey});
		if (stream) {
			params.set("alt", "sse");
		}
		return `${base}/v1beta/models/${model}:${action}?${params.toString()}`;
	}

	private buildBody(messages: ChatMessage[]): Record<string, unknown> {
		const systemParts = messages
			.filter(m => m.role === "system")
			.map(m => ({text: m.content}));

		const contents = messages
			.filter(m => m.role !== "system")
			.map(m => ({
				role: m.role === "assistant" ? "model" : "user",
				parts: [{text: m.content}],
			}));

		const body: Record<string, unknown> = {
			contents,
			generationConfig: {
				temperature: this.settings.temperature,
				maxOutputTokens: this.settings.maxTokens,
				topP: this.settings.topP,
				topK: this.settings.geminiTopK,
			},
		};

		if (systemParts.length > 0) {
			body["systemInstruction"] = {parts: systemParts};
		}

		return body;
	}

	private extractText(data: GeminiResponse): string {
		const parts = data.candidates?.[0]?.content?.parts;
		if (!parts) return "";
		return parts.map(p => p.text ?? "").join("");
	}

	private async parseError(response: Response): Promise<Error> {
		let message = `Gemini API error ${response.status}`;
		try {
			const body = await response.json() as GeminiResponse;
			if (body.error?.message) {
				message = `${message}: ${body.error.message}`;
			}
		} catch {
			// body not JSON
		}
		return new Error(message);
	}
}
