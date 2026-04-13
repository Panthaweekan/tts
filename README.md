# 🔊 Twitch Chat TTS Bot

A high-performance Twitch chat-to-speech bot powered by **Microsoft Edge Neural TTS** and **Bun**. Reads every chat message aloud with natural-sounding AI voices — supporting both Thai and English — using a zero-disk streaming architecture for minimal latency.

## ✨ Features

- **Neural AI Voices** — Natural, human-like speech via Microsoft Edge TTS (free, no API key required)
- **Thai & Multilingual Support** — Native Thai voice (`th-TH-PremwadeeNeural`) or multilingual voices that handle mixed-language text
- **Zero-Disk Streaming** — Audio streams directly from memory to your speakers via `ffplay` (no temp files, no disk wear)
- **Smart Username Shortening** — Strips numbers and truncates long names for concise readouts
- **Session Caching** — Skips repeating the username when the same person sends multiple messages within 30 seconds
- **Subscriber Priority** — Subscriber messages jump to the front of the queue
- **Anti-Spam Protection** — Global + per-user cooldowns, message length limits, emoji-only filtering, and bot blacklisting
- **Easy Configuration** — All settings adjustable via a single `.env` file
- **Bun Native** — Built for [Bun](https://bun.sh) runtime for ultra-fast startup and low memory usage (~15MB)
- **Smart Launcher** — One command to set up, authenticate, and start the bot automatically

## 📋 Prerequisites

| Requirement | Install |
|---|---|
| [Bun](https://bun.sh) v1.1+ | `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| [FFmpeg](https://ffmpeg.org) (includes `ffplay`) | `winget install ffmpeg` |
| [Twitch CLI](https://dev.twitch.tv/docs/cli/) | Download from the official page |
| Twitch Developer App | See [Authentication](#-authentication) below |

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Panthaweekan/tts.git
cd tts

# 2. Install dependencies
bun install

# 3. Set your Twitch username and channel in .env
cp .env.example .env
# Edit .env: set BOT_USERNAME and CHANNEL

# 4. One-command setup & launch
# Use the batch file for Windows or npm commands
./start-tts.bat
# OR
bun run go
```

> The launcher will automatically open a browser for Twitch authentication, save your token, and start the bot — no manual copy-pasting required.

## 🔐 Authentication

This bot uses **Twitch's official OAuth flow** via [Twitch CLI](https://dev.twitch.tv/docs/cli/) — no third-party token generators needed.

### One-Time Setup

1. **Register a Twitch App** at [dev.twitch.tv/console](https://dev.twitch.tv/console):
   - Name: anything (e.g. `Xanta TTS Bot`)
   - OAuth Redirect URL: `http://localhost:3000`
   - Category: `Chat Bot`
   - Copy your **Client ID** and **Client Secret**

2. **Install & configure Twitch CLI:**
   ```bash
   twitch configure
   # Enter your Client ID and Client Secret when prompted
   ```

3. **Run the launcher** — it handles authentication automatically:
   ```bash
   bun run go
   ```
   A browser window opens → log in with the bot account → the launcher captures and saves the token for you.

### Token Expired?

```bash
bun run auth
```

This re-authenticates, updates `.env` automatically, and restarts the bot — all in one step. The token is **never displayed in full** in the terminal (shown as `abc***xyz`).

## ⚙️ Configuration

All settings are in your `.env` file. Only the three credentials are required — everything else has sensible defaults.

| Setting | Default | Description |
|---|---|---|
| `BOT_USERNAME` | *(required)* | Twitch username of the bot account |
| `OAUTH_TOKEN` | *(auto-set by launcher)* | OAuth token — managed automatically |
| `CHANNEL` | *(required)* | Twitch channel to listen to |
| `TTS_VOICE` | `th-TH-PremwadeeNeural` | Neural voice to use ([see voices](#️-available-voices)) |
| `TTS_VOLUME` | `-95%` | Volume adjustment (`-100%` to `+0%`) |
| `NAME_MAX_LENGTH` | `6` | Max characters for username readout |
| `SESSION_WINDOW_MS` | `30000` | Skip username for repeat speaker (ms) |
| `COOLDOWN_GLOBAL_MS` | `2000` | Global cooldown between messages (ms) |
| `COOLDOWN_USER_MS` | `8000` | Per-user cooldown (ms) |
| `LOG_LEVEL` | `info` | Log verbosity: `debug`, `info`, `warn`, `error` |
| `TTS_RETRY_ATTEMPTS` | `3` | Number of retry attempts for failed TTS |
| `TTS_RETRY_DELAY_MS` | `500` | Base delay between retries (doubles each attempt) |

## 🎙️ Available Voices

| Voice ID | Language | Gender | Notes |
|---|---|---|---|
| `th-TH-PremwadeeNeural` | Thai | Female | Clear, natural Thai voice |
| `th-TH-NiwatNeural` | Thai | Male | Friendly, warm Thai voice |
| `en-US-EmmaMultilingualNeural` | Multi | Female | Handles Thai + English smoothly |
| `en-US-AndrewMultilingualNeural` | Multi | Male | Natural, deep multilingual voice |
| `en-US-AvaMultilingualNeural` | Multi | Female | Youthful, energetic voice |

## 🛠️ Commands

| Command | Description |
|---|---|
| `start-tts.bat` | Windows: Launch bot (auto-auth + Terminal title) |
| `bun run go` | Start the bot via Bun (auto-auth if token missing) |
| `bun run auth` | Force re-authenticate and restart |
| `bun run start` | Run bot directly (skips launcher) |
| `bun run test` | Run test suite (bun:test) |
| `bun run lint` | Lint src/ and tests/ with ESLint |
| `bun run format` | Auto-format src/ and tests/ with Prettier |
| `bun run build` | Compile standalone `XantaTTS.exe` |
| `bun run typecheck` | Run TypeScript type checker (`tsc --noEmit`) |
| `bun run format:check` | Check formatting without writing |
| `bun run precommit` | Run lint + format + typecheck + tests |

## 🧱 Architecture

```
Twitch IRC (tmi.js)
        ↓
Message Filters (length, emoji, system messages)
        ↓
Bot Blacklist (nightbot, streamelements, etc.)
        ↓
Cooldown Gates (global 2s / per-user 8s)
        ↓
Smart Name (strip digits, truncate, session cache)
        ↓
Priority Queue (subscribers → front)
        ↓
Edge TTS API → Audio Buffer (in memory)
        ↓
ffplay stdin pipe (zero disk I/O)
        ↓
Desktop Audio → OBS
```

## 📁 Project Structure

```
tts/
├── src/
│   ├── config.ts          # Config loading + validation
│   ├── filters.ts         # Pure message validation (length, type, emoji)
│   ├── cooldowns.ts       # Stateful cooldown tracking (global + per-user)
│   ├── names.ts           # Username cleaning + session cache
│   ├── tts.ts             # Edge TTS → ffplay audio pipeline (with retry)
│   ├── queue.ts           # Priority queue with sequential processing
│   ├── logger.ts          # Structured logging (namespaced, level-gated)
│   ├── health.ts          # Session metrics tracker
│   └── bot.ts             # Orchestrator — wires all modules
├── tests/                 # 53 automated tests
├── .github/workflows/
│   ├── ci.yml             # Quality gates (lint, format, typecheck, test)
│   └── release.yml        # Build .exe + publish to GitHub Releases
├── index.ts               # Entry point → startBot()
├── launcher.ts            # Smart launcher (auth + startup)
├── tsconfig.json          # TypeScript strict config
├── eslint.config.js       # ESLint + typescript-eslint flat config
├── .prettierrc            # Prettier formatting config
├── CHANGELOG.md           # Version history
├── package.json
├── .env                   # Credentials (git-ignored)
├── .env.example           # Config template
└── .gitignore
```

## 🚀 Releasing

To publish a new release:

```bash
# 1. Bump version in package.json
npm version patch   # or minor / major

# 2. Push the tag — triggers GitHub Actions to build & release
git push origin --tags
```

The release workflow will automatically:
- Run all quality gates (lint, format, typecheck, test)
- Compile `XantaTTS.exe` on Windows
- Create a GitHub Release with the `.exe` attached

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh) — fast JavaScript/TypeScript runtime
- **Language:** [TypeScript](https://www.typescriptlang.org/) — strict type safety
- **TTS Engine:** [edge-tts-universal](https://www.npmjs.com/package/edge-tts-universal) — Microsoft Edge Neural TTS
- **Chat Client:** [tmi.js](https://tmijs.com) — Twitch IRC
- **Audio Player:** [FFplay](https://ffmpeg.org/ffplay.html) — lightweight audio player (part of FFmpeg)
- **Auth:** [Twitch CLI](https://dev.twitch.tv/docs/cli/) — official Twitch token management
- **CI/CD:** [GitHub Actions](https://github.com/features/actions) — automated quality gates + releases

## 📄 License

[MIT](LICENSE)
