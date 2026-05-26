import {requestUrl} from "obsidian";
import type {ChatMessage} from "../types";
import type {AIPluginSettings} from "../settings";
import type {LLMProvider} from "./provider";

interface ChatCompletionResponse {
	choices?: {message?: {content?: string}}[];
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
		try {
			const response = await requestUrl({
				url: this.buildUrl(),
				method: "POST",
				headers: this.buildHeaders(),
				body: JSON.stringify(this.buildBody(messages)),
			});

			const data = response.json as ChatCompletionResponse;
			return data.choices?.[0]?.message?.content ?? "";
		} catch (err: unknown) {
			let message = `OpenAI API error`;
			if (err instanceof Error) {
				message += `: ${err.message}`;
			} else if (typeof err === "object" && err !== null && "status" in err) {
				message += ` ${String((err as {status: unknown}).status)}`;
			} else {
				message += `: ${String(err)}`;
			}
			throw new Error(message);
		}
	}

	private buildUrl(): string {
		const base = this.settings.textOpenaiBaseUrl.replace(/\/+$/, "");
		return `${base}/chat/completions`;
	}

	private buildHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.settings.textOpenaiApiKey) {
			headers["Authorization"] = `Bearer ${this.settings.textOpenaiApiKey}`;
		}
		return headers;
	}

	private buildBody(messages: ChatMessage[]): Record<string, unknown> {
		return {
			model: this.settings.textOpenaiModel,
			messages,
			temperature: this.settings.temperature,
			max_tokens: this.settings.maxTokens,
			top_p: this.settings.topP,
			frequency_penalty: this.settings.frequencyPenalty,
			presence_penalty: this.settings.presencePenalty,
		};
	}
}
