# Plug-and-Play Launcher UX

**Date:** 2026-04-13
**Status:** Approved

## Goal

Make `XantaTTS.exe` a true single-file download with an interactive first-run setup wizard. Users download the exe, double-click it, and the launcher guides them through everything — no manual `.env` editing, no external tool installation, no copy-pasting tokens.

## Target Users

- The developer (Panthaweekan) on a fresh PC or after a reinstall
- Non-technical streamers who want a TTS bot but aren't developers

## First-Run UX Flow

```
Double-click XantaTTS.exe
        ↓
=== 🚀 Xanta TTS Setup ===

Checking prerequisites...
  ✅ FFmpeg (ffplay) found
  — OR —
  ❌ FFmpeg not found
     Install now? (Y/n): Y
     → winget install ffmpeg
     ✅ FFmpeg installed!
        ↓
Enter your Twitch bot username: xanta_bot
Enter the channel to join: xanta999
        ↓
🔐 Opening browser for Twitch login...
  → Browser auto-opens Twitch OAuth page
  → User clicks "Authorize"
  → Token captured automatically
        ↓
✅ Configuration saved to .env
✅ Launching TTS Bot...
```

On subsequent runs, the launcher detects existing `.env` with valid credentials and skips straight to "Launching TTS Bot."

## Architecture

### New Module: `src/auth.ts`

Handles the built-in OAuth flow using Twitch's Implicit Grant (no Client Secret required in the binary).

**Flow:**
1. Start a local HTTP server on `localhost:3000`
2. Open the user's browser to `https://id.twitch.tv/oauth2/authorize` with:
   - `client_id` — hardcoded (Panthaweekan's registered Twitch app)
   - `redirect_uri` — `http://localhost:3000/callback`
   - `response_type=token`
   - `scope=chat:read chat:edit`
3. After the user authorizes, Twitch redirects to `http://localhost:3000/callback#access_token=TOKEN&...`
4. The server responds with a small HTML page that:
   - Reads the access token from the URL fragment (`#` part, which browsers don't send to servers)
   - Sends it back to the launcher via `fetch("/token?t=ACCESS_TOKEN")`
   - Shows a "You can close this tab" success message
5. The launcher receives the token, formats it as `oauth:TOKEN`, shuts down the HTTP server
6. Returns the token to the caller

**Interface:**
```ts
export async function authenticateWithTwitch(): Promise<string>
```

**Dependencies:** None beyond Bun's built-in `Bun.serve` and `Bun.openInBrowser` (or `spawn` to open URL).

### Modified: `launcher.ts`

**Changes:**

1. **Embedded `.env` template** — The `.env.example` content is a string constant inside the launcher. No external file needed.

2. **`prompt()` helper** — Reads a line from `process.stdin`:
   ```ts
   async function prompt(question: string): Promise<string>
   ```

3. **`checkPrerequisites()` function** — Checks for `ffplay` on PATH:
   - Found → print ✅ and continue
   - Not found → ask user if they want to auto-install via `winget install ffmpeg`
   - If user declines or winget fails → print install instructions and exit

4. **Interactive credential setup** — When `.env` is missing or `BOT_USERNAME`/`CHANNEL` are blank:
   - Prompt for bot username
   - Prompt for channel name
   - Write values to `.env`

5. **Built-in auth replaces Twitch CLI** — When `OAUTH_TOKEN` is missing or invalid:
   - Call `authenticateWithTwitch()` from `src/auth.ts`
   - Save the returned token to `.env`
   - No Twitch CLI dependency

6. **Twitch CLI fallback removed** — The `twitch token` spawn is removed entirely. All auth goes through the built-in OAuth flow.

### Modified: `.github/workflows/release.yml`

- Ship only `XantaTTS.exe` — no `.env.example` needed alongside
- Update release body with simpler instructions: "Download → Double-click → Follow prompts"

### Unchanged: `.env.example`

Kept in the repo for development use (`bun run go` still reads it), but not required for the compiled exe.

## Prerequisite Detection Detail

```ts
async function checkPrerequisites(): Promise<void>
```

**FFmpeg check:**
- Run `ffplay -version` and check exit code
- If exit code 0 → found
- If error → offer to install via `winget install ffmpeg`
- After install attempt, re-check `ffplay -version`
- If still missing → print manual install URL and exit

## Edge Cases

| Scenario | Behavior |
|---|---|
| Port 3000 already in use | Try a few alternative ports (3001, 3002), update redirect URI |
| User closes browser without authorizing | Timeout after 120s, show error, offer to retry |
| Token expires on subsequent run | Detect 401-style errors, re-run OAuth flow |
| `.env` exists but credentials are blank | Prompt for the missing values only |
| User cancels FFmpeg install | Show manual install instructions and exit |
| winget not available | Show direct download URL for FFmpeg |

## Security

- **Client ID is public** — Twitch docs explicitly state Client IDs are not secrets
- **No Client Secret in binary** — Implicit Grant Flow doesn't require one
- **Token stored locally** — Only in the user's `.env` file, which is gitignored
- **Minimal scopes** — Only `chat:read` and `chat:edit`

## Required Before Implementation

- Panthaweekan's Twitch app **Client ID** from [dev.twitch.tv/console](https://dev.twitch.tv/console)
- Confirm `http://localhost:3000/callback` is registered as an OAuth Redirect URL in the Twitch app settings
