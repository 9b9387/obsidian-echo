import {requestUrl} from "obsidian";
import type {ChatMessage} from "../types";
import type {AIPluginSettings} from "../settings";
import type {LLMProvider} from "./provider";

interface GeminiResponse {
	candidates?: {content?: {parts?: {text?: string}[]}}[];
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
		try {
			const response = await requestUrl({
				url: this.buildUrl(),
				method: "POST",
				headers: {"Content-Type": "application/json"},
				body: JSON.stringify(this.buildBody(messages)),
			});

			const data = response.json as GeminiResponse;
			return this.extractText(data);
		} catch (err: unknown) {
			let message = `Gemini API error`;
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
		const base = this.settings.textGeminiBaseUrl.replace(/\/+$/, "");
		const model = this.settings.textGeminiModel;
		const action = "generateContent";
		const params = new URLSearchParams({key: this.settings.textGeminiApiKey});
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
				topK: this.settings.textGeminiTopK,
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
}
