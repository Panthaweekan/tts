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

## 📋 Prerequisites

| Requirement | Install |
|---|---|
| [Bun](https://bun.sh) v1.1+ | `powershell -c "irm bun.sh/install.ps1 \| iex"` |
| [FFmpeg](https://ffmpeg.org) (includes `ffplay`) | `winget install ffmpeg` |
| Twitch Account | [twitch.tv](https://twitch.tv) |
| Twitch OAuth Token | See [Authentication](#-authentication) below |

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/Panthaweekan/tts.git
cd tts

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Twitch credentials (see Authentication section)

# 4. Run the bot
bun index.js
```

## 🔐 Authentication

This bot uses **Twitch's official OAuth flow** via [Twitch CLI](https://dev.twitch.tv/docs/cli/) — no third-party token generators needed.

### One-Time Setup

1. **Register a Twitch App** at [dev.twitch.tv/console](https://dev.twitch.tv/console):
   - Name: `Your TTS Bot`
   - OAuth Redirect URL: `http://localhost:3000`
   - Category: `Chat Bot`
   - Copy your **Client ID** and **Client Secret**

2. **Install & configure Twitch CLI:**
   ```bash
   # Download from https://dev.twitch.tv/docs/cli/
   twitch configure
   # Enter your Client ID and Client Secret when prompted
   ```

3. **Generate a token with chat permissions:**
   ```bash
   twitch token -u -s "chat:read chat:edit"
   ```
   A browser window will open — log in with the account you want the bot to use.

4. **Update your `.env`:**
   ```env
   BOT_USERNAME=your_bot_username
   OAUTH_TOKEN=oauth:<token_from_step_3>
   CHANNEL=your_channel_name
   ```

> **Note:** Tokens expire periodically. If the bot fails to connect, regenerate with `twitch token -u -s "chat:read chat:edit"`.

## ⚙️ Configuration

All settings are in your `.env` file. Every setting has a sensible default — you only need to set the three credentials to get started.

| Setting | Default | Description |
|---|---|---|
| `BOT_USERNAME` | *(required)* | Twitch username of the bot account |
| `OAUTH_TOKEN` | *(required)* | OAuth token (must start with `oauth:`) |
| `CHANNEL` | *(required)* | Twitch channel to listen to |
| `TTS_VOICE` | `th-TH-PremwadeeNeural` | Neural voice to use ([see voices](#-available-voices)) |
| `TTS_VOLUME` | `-95%` | Volume adjustment (`-100%` to `+0%`) |
| `NAME_MAX_LENGTH` | `6` | Max characters for username readout |
| `SESSION_WINDOW_MS` | `30000` | Skip username for repeat speaker (ms) |
| `COOLDOWN_GLOBAL_MS` | `2000` | Global cooldown between messages (ms) |
| `COOLDOWN_USER_MS` | `8000` | Per-user cooldown (ms) |

## 🎙️ Available Voices

| Voice ID | Language | Gender | Notes |
|---|---|---|---|
| `th-TH-PremwadeeNeural` | Thai | Female | Clear, natural Thai voice |
| `th-TH-NiwatNeural` | Thai | Male | Friendly, warm Thai voice |
| `en-US-EmmaMultilingualNeural` | Multi | Female | Handles Thai + English smoothly |
| `en-US-AndrewMultilingualNeural` | Multi | Male | Natural, deep multilingual voice |
| `en-US-AvaMultilingualNeural` | Multi | Female | Youthful, energetic voice |

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
├── index.js          # Bot logic (single file, ~180 lines)
├── package.json      # Dependencies & scripts
├── .env              # Your credentials & settings (git-ignored)
├── .env.example      # Template for .env
├── .gitignore
├── bun.lock
└── docs/             # Design specs
```

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh) — fast JavaScript runtime
- **TTS Engine:** [edge-tts-universal](https://www.npmjs.com/package/edge-tts-universal) — Microsoft Edge Neural TTS
- **Chat Client:** [tmi.js](https://tmijs.com) — Twitch IRC
- **Audio Player:** [FFplay](https://ffmpeg.org/ffplay.html) — lightweight audio player (part of FFmpeg)

## 📄 License

ISC
