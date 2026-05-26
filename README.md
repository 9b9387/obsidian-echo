# Echo AI

[English](#english) | [中文](#中文)

---

<a name="english"></a>

AI-powered writing assistant for [Obsidian](https://obsidian.md). Minimalist, context-aware, and built for a seamless writing experience. Supports OpenAI-compatible APIs and Google Gemini.

## Core Philosophy

Echo is designed to be **"invisible"**. It eschews complex chat interfaces in favor of maintaining your creative flow. Like an echo, it precisely fulfills your instructions based on your existing text and context.

## Key Features

### Echo — Inline AI Writing

The core feature. Triggered via `/echo` or the command palette, a minimalist input box appears at the cursor position.

- **Type an instruction** and press Enter — AI generates content based on your request.
- **Press Enter directly** (empty input) — AI naturally continues writing from the current position.
- **Smart Context** — Automatically includes:
  - Current section content (text between headings).
  - Document outline (all headings).
  - Style reference (automatically references adjacent sections for tone and style when the current section is short).
- **Native Output** — AI responses match the language, tone, and style of your existing content without conversational filler.
- **Real-time Streaming** — Responses appear token-by-token in real time.

### Translate

Triggered via the toolbar, slash command `/translate`, or right-click menu after selecting text. Completes translations while preserving original formatting.

### Selection Toolbar

A floating toolbar appears when text is selected, providing quick access to Echo or Translation functions.

### Slash Commands

Type `/` in the editor to call up the command menu:
- `/echo` — AI Write / Continue
- `/translate` — Translate selection

### Custom Actions

Define your own AI actions in settings. Supports placeholders like `{{selection}}` and `{{input}}` to configure exclusive Prompt templates.

## Supported Providers

| Provider | Text Generation |
|---|---|
| **OpenAI-compatible** | GPT-4o, GPT-4o-mini, DeepSeek, etc. |
| **Google Gemini** | Gemini 1.5 Flash, 2.0 Flash, etc. |

Switch providers easily via a dropdown menu in settings.

## Installation

### Manual

1. Download `main.js`, `styles.css`, and `manifest.json` from the [Latest Release](https://github.com/9b9387/echo-ai/releases).
2. Create a folder named `echo-ai` in your vault's `.obsidian/plugins/` directory.
3. Place the downloaded files into that folder.
4. Restart Obsidian and enable it in **Settings → Community plugins**.

### From Source

```bash
git clone git@github.com:9b9387/echo-ai.git
cd echo-ai
npm install
npm run build
```

Copy the generated `main.js`, `styles.css`, and `manifest.json` to the `.obsidian/plugins/echo-ai/` directory.

---

<a name="中文"></a>

适用于 [Obsidian](https://obsidian.md) 的 AI 写作助手。极简、感知上下文，专为无缝创作体验而设计。支持 OpenAI 兼容 API 和 Google Gemini。

## 核心理念

Echo 的设计初衷是**“不可见”**。它没有复杂的聊天界面，不打断你的创作流。它像一个回声，基于你现有的文字和上下文，精准地完成你的指令。

## 主要特性

### Echo — 划词/行内 AI 写作

核心功能。通过 `/echo` 或命令面板触发，在光标位置出现简洁的输入框。

- **输入指令**并回车 — AI 根据请求生成内容。
- **直接回车**（空输入） — AI 将根据当前位置自然续写。
- **智能上下文** — 自动包含：
  - 当前小节内容（标题之间的文字）。
  - 文档大纲（所有标题）。
  - 风格参考（当当前小节内容较少时，自动参考相邻小节的写作风格）。
- **原生输出** — AI 响应会匹配你现有内容的语言、语气和风格，没有废话。
- **实时流式响应** — 响应内容逐字实时显示。

### 翻译 (Translate)

选择文字后通过工具栏、斜杠命令 `/translate` 或右键菜单触发。在保留原始格式的基础上完成翻译。

### 快捷悬浮工具栏 (Selection Toolbar)

选中文字时出现浮动工具栏，快速调用 Echo 或翻译功能。

### 斜杠命令 (Slash Commands)

在编辑器中输入 `/` 呼出命令菜单：
- `/echo` — AI 写作 / 续写
- `/translate` — 翻译选中内容

### 自定义动作 (Custom Actions)

在设置中定义你自己的 AI 动作。支持 `{{selection}}` 和 `{{input}}` 等占位符，配置专属的 Prompt 模板。

## 支持的供应商 (Providers)

| 供应商 | 文本生成 |
|---|---|
| **OpenAI-compatible** | GPT-4o, GPT-4o-mini, DeepSeek, 等 |
| **Google Gemini** | Gemini 1.5 Flash, 2.0 Flash, 等 |

可在设置中通过下拉菜单轻松切换。

## 安装方法

### 手动安装

1. 从 [最新发布页面](https://github.com/9b9387/echo-ai/releases) 下载 `main.js`, `styles.css`, 和 `manifest.json`。
2. 在你的库目录 `.obsidian/plugins/` 下创建名为 `echo-ai` 的文件夹。
3. 将下载的文件放入该文件夹。
4. 重启 Obsidian 并在 **设置 → 社区插件** 中启用。

### 源码编译

```bash
git clone git@github.com:9b9387/echo-ai.git
cd echo-ai
npm install
npm run build
```

将生成的 `main.js`, `styles.css`, 和 `manifest.json` 复制到 `.obsidian/plugins/echo-ai/` 目录。

## 许可证 (License)

[0-BSD](LICENSE)
