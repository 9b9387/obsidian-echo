# Obsidian Echo

AI-powered writing assistant for [Obsidian](https://obsidian.md). Supports OpenAI-compatible APIs and Google Gemini.

## Features

### Echo — Inline AI Writing

The core feature. Trigger with `/echo` or the command palette, an inline input appears at the cursor position.

- **Type an instruction** and press Enter — AI writes content based on your request
- **Press Enter directly** (empty input) — AI continues writing from the current position
- **Smart context** — automatically includes:
  - Current section content (text between headings)
  - Document outline (all headings)
  - Sibling sections as style reference (when current section is short)
- **Document-native output** — AI responses match the language, tone, and style of your existing content. No conversational filler.
- **Streaming** — responses appear token-by-token in real time

### Translate

Select text and trigger via toolbar, slash command `/translate`, or right-click menu. Translates selected text while preserving formatting.

### Generate Image

Create AI-generated images from text descriptions.

- Select text for context, then trigger via toolbar, `/generate-image`, or right-click menu
- Choose from preset styles (Photorealistic, Illustration, Watercolor, Oil Painting, Pixel Art, Anime, Minimalist, etc.)
- Choose image size (Square, Portrait, Landscape)
- Images are saved to the vault and inserted as Markdown links
- Supports DALL-E (OpenAI) and Gemini image generation

### Selection Toolbar

A floating toolbar appears when you select text, providing quick access to Echo, Translate, and Generate Image.

### Slash Commands

Type `/` in the editor to trigger a command menu:
- `/echo` — AI write / continue
- `/translate` — translate selection
- `/generate-image` — generate image

### Custom Actions

Define your own AI actions in settings with custom prompt templates. Use `{{selection}}` and `{{input}}` placeholders.

## Supported Providers

| Provider | Text Generation | Image Generation |
|---|---|---|
| **OpenAI-compatible** | GPT-4o, GPT-4o-mini, etc. | DALL-E 3 |
| **Google Gemini** | Gemini 2.5 Flash, etc. | Gemini image generation |

Switch between providers in settings via a dropdown menu.

## Installation

### Manual

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/9b9387/obsidian-echo/releases)
2. Create a folder `obsidian-echo` in your vault's `.obsidian/plugins/` directory
3. Copy the downloaded files into the folder
4. Restart Obsidian and enable the plugin in **Settings → Community plugins**

### From Source

```bash
git clone git@github.com:9b9387/obsidian-echo.git
cd obsidian-echo
npm install
npm run build
```

Copy `main.js`, `styles.css`, and `manifest.json` to your vault's `.obsidian/plugins/obsidian-echo/`.

## Configuration

Open **Settings → Obsidian Echo** to configure:

- **Provider** — switch between OpenAI-compatible and Gemini
- **API Key / Base URL / Model** — per-provider configuration
- **Model Parameters** — temperature, max tokens, top P, frequency/presence penalty
- **Image Generation** — model, default size, save folder, style presets, size presets
- **System Prompt** — global system instruction appended to all requests
- **Slash Trigger** — customize the trigger character (default: `/`)
- **Streaming** — enable/disable streaming output
- **Insert Mode** — cursor (insert at cursor) or replace (replace selection)
- **Custom Actions** — create your own prompt-based actions

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
npm run lint   # eslint check
```

## License

[0-BSD](LICENSE)
