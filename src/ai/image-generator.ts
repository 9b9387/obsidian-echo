import type {AIPluginSettings} from "../settings";

interface DalleResponse {
	data?: {b64_json?: string}[];
}

interface GeminiTextPart {
	text: string;
}

interface GeminiInlineDataPart {
	inlineData: {mimeType: string; data: string};
}

type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

interface GeminiImageResponse {
	candidates?: {content?: {parts?: GeminiPart[]}}[];
	error?: {message?: string};
}

interface DalleError {
	error?: {message?: string};
}

export interface ImageResult {
	data: ArrayBuffer;
	extension: string;
}

export class ImageGenerator {
	private settings: AIPluginSettings;

	constructor(settings: AIPluginSettings) {
		this.settings = settings;
	}

	updateSettings(settings: AIPluginSettings): void {
		this.settings = settings;
	}

	async generate(prompt: string, sizeValue?: string): Promise<ImageResult> {
		if (this.settings.provider === "gemini") {
			return this.generateWithGemini(prompt);
		}
		return this.generateWithDalle(prompt, sizeValue);
	}

	private async generateWithDalle(prompt: string, sizeValue?: string): Promise<ImageResult> {
		const base = this.settings.baseUrl.replace(/\/+$/, "");
		const url = `${base}/images/generations`;

		// eslint-disable-next-line no-restricted-globals -- image API requires native fetch
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${this.settings.apiKey}`,
			},
			body: JSON.stringify({
				model: this.settings.imageModel,
				prompt,
				n: 1,
				size: sizeValue || this.settings.imageSize,
				response_format: "b64_json",
			}),
		});

		if (!response.ok) {
			throw await this.parseDalleError(response);
		}

		const data = await response.json() as DalleResponse;
		const b64 = data.data?.[0]?.b64_json;
		if (!b64) throw new Error("No image data in response");

		return {
			data: ImageGenerator.base64ToBuffer(b64),
			extension: "png",
		};
	}

	private async generateWithGemini(prompt: string): Promise<ImageResult> {
		const base = this.settings.geminiBaseUrl.replace(/\/+$/, "");
		const model = this.settings.geminiImageModel;
		const params = new URLSearchParams({key: this.settings.geminiApiKey});
		const url = `${base}/v1beta/models/${model}:generateContent?${params.toString()}`;

		// eslint-disable-next-line no-restricted-globals -- image API requires native fetch
		const response = await fetch(url, {
			method: "POST",
			headers: {"Content-Type": "application/json"},
			body: JSON.stringify({
				contents: [{parts: [{text: prompt}]}],
				generationConfig: {responseModalities: ["IMAGE", "TEXT"]},
			}),
		});

		if (!response.ok) {
			throw await this.parseGeminiError(response);
		}

		const result = await response.json() as GeminiImageResponse;
		const parts = result.candidates?.[0]?.content?.parts;
		if (!parts) throw new Error("No image data in Gemini response");

		for (const part of parts) {
			if ("inlineData" in part) {
				const {data: b64, mimeType} = part.inlineData;
				const ext = ImageGenerator.mimeToExt(mimeType);
				return {
					data: ImageGenerator.base64ToBuffer(b64),
					extension: ext,
				};
			}
		}

		throw new Error("No image found in Gemini response");
	}

	private static base64ToBuffer(b64: string): ArrayBuffer {
		const raw = atob(b64);
		const arr = new Uint8Array(raw.length);
		for (let i = 0; i < raw.length; i++) {
			arr[i] = raw.charCodeAt(i);
		}
		return arr.buffer;
	}

	private static mimeToExt(mime: string): string {
		if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
		if (mime.includes("webp")) return "webp";
		return "png";
	}

	private async parseDalleError(response: Response): Promise<Error> {
		let message = `DALL-E API error ${response.status}`;
		try {
			const body = await response.json() as DalleError;
			if (body.error?.message) {
				message = `${message}: ${body.error.message}`;
			}
		} catch { /* body not JSON */ }
		return new Error(message);
	}

	private async parseGeminiError(response: Response): Promise<Error> {
		let message = `Gemini image API error ${response.status}`;
		try {
			const body = await response.json() as GeminiImageResponse;
			if (body.error?.message) {
				message = `${message}: ${body.error.message}`;
			}
		} catch { /* body not JSON */ }
		return new Error(message);
	}
}
