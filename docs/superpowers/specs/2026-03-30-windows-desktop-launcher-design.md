# Design Spec: Windows Desktop Launcher

**Date:** 2026-03-30
**Status:** Approved

## Objective

Make it trivially easy to start the Xanta TTS Bot on Windows — a single double-click on a Desktop icon, no terminal needed beforehand, no commands to remember.

## User Flow

```
Double-click Desktop icon ("🔊 Xanta TTS Bot")
        ↓
Terminal window opens with title "🔊 Xanta TTS Bot"
        ↓
launcher.js runs via: bun run auth
        ↓
Browser opens for Twitch authorization (if token expired)
        ↓
Token saved automatically → Bot connects → Ready
        ↓
(On Ctrl+C or error) — Terminal stays open with "Press any key to continue..."
```

## Components

### [NEW] `start-tts.bat`
A Windows Batch script in the project root. Responsibilities:
- Set the terminal window title
- `cd` to the project directory (absolute path, handles spaces)
- Run `bun run auth`
- Call `pause` at the end so the window doesn't vanish on error

```bat
@echo off
title 🔊 Xanta TTS Bot
cd /d "%~dp0"
bun run auth
pause
```

### [NEW] Desktop Shortcut (`Xanta TTS Bot.lnk`)
A Windows Shell Shortcut created via PowerShell. Properties:
- **Target:** Absolute path to `start-tts.bat`
- **Start in:** Project directory (so relative paths in .bat work correctly)
- **Window style:** Normal window (not minimized/maximized)
- **Saved to:** `$env:USERPROFILE\Desktop\Xanta TTS Bot.lnk`

The shortcut is created programmatically via a one-time PowerShell setup script so it works on any machine without manual drag-and-drop.

### [NEW] `setup-shortcut.ps1` (one-time setup)
A PowerShell script that creates the Desktop shortcut automatically. Run once after cloning:
```powershell
# Creates Desktop shortcut pointing to start-tts.bat
```
This means any fresh clone can be set up with a single command instead of manual Windows Explorer steps.

## Files Changed

| File | Status | Notes |
|---|---|---|
| `start-tts.bat` | NEW | Main launcher batch file |
| `setup-shortcut.ps1` | NEW | One-time shortcut creator |
| `.gitignore` | MODIFY | Add `*.lnk` (shortcuts are machine-specific) |
| `README.md` | MODIFY | Add setup instructions under Quick Start |

## Constraints & Decisions

- **`bun run auth` not `bun run go`** — Always re-authenticates to handle expired tokens without user needing to know the difference
- **`%~dp0` for path** — Ensures `.bat` works regardless of where it's placed or double-clicked from
- **`.lnk` is git-ignored** — Shortcuts contain absolute paths, machine-specific, shouldn't be committed
- **`pause` at end** — Critical for visibility; without it the terminal closes instantly on any error

## Success Criteria

- Double-clicking the Desktop icon opens a Terminal and starts the bot
- Works even if the current working directory is Desktop or another folder
- Terminal stays open if an error occurs (user can read it)
- Fresh clone → run `setup-shortcut.ps1` once → shortcut works
