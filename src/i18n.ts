import {getLanguage} from "obsidian";

export type SettingsText = {
	model: string;
	modelDesc: string;
	actions: string;
	actionsDesc: string;
	addAction: string;
	provider: string;
	providerDesc: string;
	openaiCompatible: string;
	googleGemini: string;
	apiKeySecret: string;
	apiKeySecretDesc: string;
	baseUrl: string;
	openaiBaseUrlDesc: string;
	geminiBaseUrlDesc: string;
	modelId: string;
	openaiModelDesc: string;
	geminiModelDesc: string;
	actionName: string;
	actionNameDesc: string;
	actionNamePlaceholder: string;
	triggerMethod: string;
	triggerMethodDesc: string;
	slashOnly: string;
	toolbarOnly: string;
	bothSlashToolbar: string;
	icon: string;
	iconDescPrefix: string;
	iconDescLink: string;
	iconDescSuffix: string;
	outputMode: string;
	outputModeDesc: string;
	replaceSelection: string;
	insertAtCursor: string;
	insertAtNextLine: string;
	promptTemplate: string;
	placeholdersAll: string;
	placeholdersSlash: string;
	placeholdersToolbar: string;
	deleteAction: string;
	unnamedAction: string;
	metaSlash: string;
	metaToolbar: string;
	metaBoth: string;
	metaReplace: string;
	metaCursor: string;
	metaNextLine: string;
	placeholderSlash: string;
	placeholderToolbar: string;
	placeholderBoth: string;
};

const EN_TEXT: SettingsText = {
	model: "Model",
	modelDesc: "Choose the text provider and credentials Echo uses for writing.",
	actions: "Actions",
	actionsDesc: "Customize the writing actions available from slash commands and the selection toolbar.",
	addAction: "Add action",
	provider: "Provider",
	providerDesc: "Provider used for text generation.",
	openaiCompatible: "OpenAI compatible",
	googleGemini: "Google Gemini",
	apiKeySecret: "API key secret",
	apiKeySecretDesc: "Select or create a secret in Obsidian Secret Storage.",
	baseUrl: "Base url",
	openaiBaseUrlDesc: "Text endpoint for an OpenAI-compatible API.",
	geminiBaseUrlDesc: "Text endpoint for the Gemini API.",
	modelId: "Model id",
	openaiModelDesc: "Model used for text generation.",
	geminiModelDesc: "Gemini model used for text generation.",
	actionName: "Action name",
	actionNameDesc: "Display name used in menus.",
	actionNamePlaceholder: "Action name",
	triggerMethod: "Trigger method",
	triggerMethodDesc: "Where to show this action.",
	slashOnly: "Slash command only",
	toolbarOnly: "Selection toolbar only",
	bothSlashToolbar: "Both slash and toolbar",
	icon: "Icon",
	iconDescPrefix: "Lucide icon name used in the selection toolbar. Browse icons at ",
	iconDescLink: "lucide.dev/icons",
	iconDescSuffix: ".",
	outputMode: "Output mode",
	outputModeDesc: "How to insert the generated text.",
	replaceSelection: "Replace selection",
	insertAtCursor: "Insert at cursor",
	insertAtNextLine: "Insert at next line",
	promptTemplate: "Prompt template",
	placeholdersAll: "Placeholders: {{selection}}, {{outline}}, {{section}}, {{full}}, {{input}}.",
	placeholdersSlash: "Placeholders: {{outline}}, {{section}}, {{full}}, {{input}}. Slash does not support {{selection}}.",
	placeholdersToolbar: "Placeholders: {{selection}}, {{outline}}, {{section}}, {{full}}. Toolbar does not support {{input}}.",
	deleteAction: "Delete action",
	unnamedAction: "Unnamed action",
	metaSlash: "Slash",
	metaToolbar: "Toolbar",
	metaBoth: "Slash + toolbar",
	metaReplace: "Replace",
	metaCursor: "Cursor",
	metaNextLine: "Next line",
	placeholderSlash: "{{full}}\n\n{{input}}\n\nContinue writing from the current note context.",
	placeholderToolbar: "Rewrite the selected text with clearer wording while preserving the original meaning.\n\n{{selection}}",
	placeholderBoth: "{{input}}\n\nUse the selected text or current note context as reference.\n\n{{selection}}\n\n{{full}}",
};

const ZH_TEXT: SettingsText = {
	model: "模型",
	modelDesc: "选择 Echo 写作时使用的文本模型服务和凭据。",
	actions: "动作",
	actionsDesc: "自定义斜杠命令和划选工具栏中显示的写作动作。",
	addAction: "添加动作",
	provider: "服务商",
	providerDesc: "用于文本生成的服务商。",
	openaiCompatible: "OpenAI 兼容",
	googleGemini: "Google Gemini",
	apiKeySecret: "API 密钥 secret",
	apiKeySecretDesc: "在 Obsidian Secret Storage 中选择或创建一个 secret。",
	baseUrl: "Base url",
	openaiBaseUrlDesc: "OpenAI 兼容 API 的文本接口地址。",
	geminiBaseUrlDesc: "Gemini API 的文本接口地址。",
	modelId: "模型 id",
	openaiModelDesc: "用于文本生成的模型。",
	geminiModelDesc: "用于文本生成的 Gemini 模型。",
	actionName: "动作名称",
	actionNameDesc: "在菜单中显示的名称。",
	actionNamePlaceholder: "动作名称",
	triggerMethod: "触发方式",
	triggerMethodDesc: "这个动作显示在哪里。",
	slashOnly: "仅斜杠命令",
	toolbarOnly: "仅划选工具栏",
	bothSlashToolbar: "斜杠命令和划选工具栏",
	icon: "图标",
	iconDescPrefix: "划选工具栏中使用的 Lucide 图标名称。可在这里查询图标：",
	iconDescLink: "lucide.dev/icons",
	iconDescSuffix: "。",
	outputMode: "输出方式",
	outputModeDesc: "如何插入生成的文本。",
	replaceSelection: "替换选中文本",
	insertAtCursor: "插入到光标处",
	insertAtNextLine: "插入到下一行",
	promptTemplate: "提示词模板",
	placeholdersAll: "可用占位符：{{selection}}、{{outline}}、{{section}}、{{full}}、{{input}}。",
	placeholdersSlash: "可用占位符：{{outline}}、{{section}}、{{full}}、{{input}}。斜杠命令不支持 {{selection}}。",
	placeholdersToolbar: "可用占位符：{{selection}}、{{outline}}、{{section}}、{{full}}。划选工具栏不支持 {{input}}。",
	deleteAction: "删除动作",
	unnamedAction: "未命名动作",
	metaSlash: "斜杠",
	metaToolbar: "工具栏",
	metaBoth: "斜杠 + 工具栏",
	metaReplace: "替换",
	metaCursor: "光标处",
	metaNextLine: "下一行",
	placeholderSlash: "{{full}}\n\n{{input}}\n\n根据当前笔记上下文继续写作。",
	placeholderToolbar: "在保留原意的基础上，改写选中的文本，让表达更清晰。\n\n{{selection}}",
	placeholderBoth: "{{input}}\n\n参考选中文本或当前笔记上下文。\n\n{{selection}}\n\n{{full}}",
};

export function getSettingsText(): SettingsText {
	return getLanguage() === "zh" ? ZH_TEXT : EN_TEXT;
}
