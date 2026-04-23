import type {Editor} from "obsidian";

export interface EditorContext {
	sectionTitle: string;
	sectionContent: string;
	siblingContent: string;
	outline: string;
}

const SHORT_SECTION_THRESHOLD = 500;
const MAX_SECTION_CHARS = 3000;
const MAX_SIBLING_CHARS = 4000;

interface Section {
	level: number;
	title: string;
	startLine: number;
	endLine: number;
}

export function buildEditorContext(editor: Editor): EditorContext {
	const totalLines = editor.lineCount();
	const cursorLine = editor.getCursor().line;
	const allLines: string[] = [];
	for (let i = 0; i < totalLines; i++) {
		allLines.push(editor.getLine(i));
	}

	const outline = extractOutline(allLines);
	const sections = parseSections(allLines);
	const currentIdx = findCurrentSection(sections, cursorLine);

	const current = currentIdx >= 0 ? sections[currentIdx]! : null;
	const sectionContent = current
		? getContent(allLines, current.startLine, current.endLine)
		: "";

	let siblingContent = "";
	if (current && sectionContent.length < SHORT_SECTION_THRESHOLD) {
		siblingContent = collectSiblingContent(allLines, sections, currentIdx);
	}

	return {
		sectionTitle: current?.title ?? "",
		sectionContent: truncate(sectionContent, MAX_SECTION_CHARS),
		siblingContent: truncate(siblingContent, MAX_SIBLING_CHARS),
		outline,
	};
}

function extractOutline(lines: string[]): string {
	const headings: string[] = [];
	for (const line of lines) {
		if (/^#{1,6}\s/.test(line)) {
			headings.push(line);
		}
	}
	return headings.join("\n");
}

function headingLevel(line: string): number {
	const match = line.match(/^(#{1,6})\s/);
	return match?.[1]?.length ?? 0;
}

function parseSections(lines: string[]): Section[] {
	const sections: Section[] = [];
	let currentSection: Section | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const lvl = headingLevel(line);
		if (lvl > 0) {
			if (currentSection) {
				currentSection.endLine = i;
				sections.push(currentSection);
			}
			currentSection = {
				level: lvl,
				title: line.replace(/^#+\s*/, ""),
				startLine: i,
				endLine: lines.length,
			};
		} else if (!currentSection && line.trim().length > 0) {
			// Document has content before any heading
			currentSection = {
				level: 1,
				title: "Document",
				startLine: 0,
				endLine: lines.length,
			};
		}
	}
	if (currentSection) {
		currentSection.endLine = lines.length;
		sections.push(currentSection);
	}
	return sections;
}

function findCurrentSection(sections: Section[], cursorLine: number): number {
	for (let i = sections.length - 1; i >= 0; i--) {
		if (sections[i]!.startLine <= cursorLine) {
			return i;
		}
	}
	return -1;
}

function collectSiblingContent(
	lines: string[],
	sections: Section[],
	currentIdx: number,
): string {
	const current = sections[currentIdx]!;
	const level = current.level;

	let parentStart = -1;
	let parentEnd = lines.length;
	for (let i = currentIdx - 1; i >= 0; i--) {
		if (sections[i]!.level < level) {
			parentStart = i;
			break;
		}
	}
	for (let i = currentIdx + 1; i < sections.length; i++) {
		if (sections[i]!.level < level) {
			parentEnd = sections[i]!.startLine;
			break;
		}
	}

	const siblings: string[] = [];
	for (let i = 0; i < sections.length; i++) {
		if (i === currentIdx) continue;
		const s = sections[i]!;
		if (s.level !== level) continue;
		if (s.startLine <= (parentStart >= 0 ? sections[parentStart]!.startLine : -1)) continue;
		if (s.startLine >= parentEnd) continue;
		siblings.push(getContent(lines, s.startLine, s.endLine));
	}

	return siblings.join("\n\n");
}

function getContent(lines: string[], start: number, end: number): string {
	return lines.slice(start, end).join("\n").trim();
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return text.slice(0, max) + "\n...(truncated)";
}

export const INLINE_ASK_SYSTEM_PROMPT = `You are a writing assistant that adds content to a user's Markdown document.

RULES:
- Output ONLY the content to be inserted. No greetings, no preamble, no "Sure, let me explain...", no sign-off.
- Match the language of the existing document. If the document is in Chinese, respond in Chinese. If in English, respond in English.
- Match the tone and style of the existing content. If sibling sections are provided, use them as a style reference.
- Use Markdown formatting that fits the document structure (headings, lists, bold, etc.).
- Do NOT repeat content already present in the document.
- Do NOT wrap your response in a code block unless the user explicitly asks for code.
- Be concise and informative. Every sentence should add value.`;

export function formatContextPrompt(ctx: EditorContext, instruction: string): string {
	const parts: string[] = [];

	parts.push("<document_context>");

	if (ctx.outline) {
		parts.push(`<outline>\n${ctx.outline}\n</outline>`);
	}

	if (ctx.sectionContent) {
		parts.push(`<current_section>\n${ctx.sectionContent}\n</current_section>`);
	}

	if (ctx.siblingContent) {
		parts.push(`<sibling_sections_for_style_reference>\n${ctx.siblingContent}\n</sibling_sections_for_style_reference>`);
	}

	parts.push("</document_context>");

	if (instruction) {
		parts.push(`<task>${instruction}</task>`);
	} else {
		parts.push("<task>Continue writing naturally from where the current section ends. Expand on the topic, add detail, and maintain the same structure and depth as sibling sections.</task>");
	}

	return parts.join("\n\n");
}
