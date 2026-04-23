import type {ChatMessage} from "../types";
import type {AIPluginSettings} from "../settings";
import type {LLMProvider} from "./provider";

interface ChatCompletionResponse {
	choices?: {message?: {content?: string}}[];
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
			body: JSON.stringify(this.buildBody(messages)),
		});

		if (!response.ok) {
			throw await this.parseError(response);
		}

		const data = await response.json() as ChatCompletionResponse;
		return data.choices?.[0]?.message?.content ?? "";
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

	private buildBody(messages: ChatMessage[]): Record<string, unknown> {
		return {
			model: this.settings.model,
			messages,
			temperature: this.settings.temperature,
			max_tokens: this.settings.maxTokens,
			top_p: this.settings.topP,
			frequency_penalty: this.settings.frequencyPenalty,
			presence_penalty: this.settings.presencePenalty,
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
