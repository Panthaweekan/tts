# Design Spec: Bun Native v2 — Zero Disk Streaming

**Status:** ✅ Implemented (2026-03-30)

## Objective
Comprehensive upgrade that resolved all outstanding issues from v1:
1. Cleaned up mixed ESM/CJS imports to **pure ESM**.
2. Replaced PowerShell + temp file playback with **FFplay stdin streaming** (zero disk I/O).
3. Removed stale files (`package-lock.json`, `temp_audio/`).
4. Synced all design docs with actual behavior.

## Final Architecture

```text
Twitch IRC (tmi.js)
        ↓
Message Filter (Length, Emoji, System)
        ↓
Cooldown Gate (Global 2s / User 8s)
        ↓
Smart Name + Session Cache (30s window)
        ↓
Priority Router (Subscribers → front of queue)
        ↓
Edge TTS API → Audio Buffer (in memory)
        ↓
Bun.spawn(ffplay, { stdin: buffer }) — Zero Disk
        ↓
System Desktop Audio → OBS
```

## Changes Made

### [MODIFIED] index.js
- Pure ESM: `import tmi from 'tmi.js'` (no more `require`)
- Removed all `temp_audio` directory logic (`mkdir`, `unlink`, `rm`, `join`, `Bun.write`)
- Audio streams directly from memory buffer to `ffplay` via stdin pipe:
  ```js
  const proc = Bun.spawn(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-i", "pipe:0"], {
    stdin: audioBuffer,
  });
  await proc.exited;
  ```
- Simplified `shutdown()` — no temp directory to clean

### [MODIFIED] package.json
- `"type": "module"` (was `"commonjs"`)
- `"start": "bun index.js"`
- Removed `dotenv` and `fs-extra` from dependencies

### [DELETED] package-lock.json
- Bun uses `bun.lock` instead

### [DELETED] temp_audio/
- No longer needed — audio streams from memory

### [MODIFIED] Design Specs
- Updated `2026-03-29-twitch-tts-bot-design.md` to reflect Smart Name, Session Caching, and Zero-Disk architecture

## Prerequisites
- **Bun** v1.1+ — `powershell -c "irm bun.sh/install.ps1 | iex"`
- **FFmpeg** (provides `ffplay`) — `winget install ffmpeg`

## Verification Results
- ✅ Bot connects to Twitch IRC successfully
- ✅ Edge TTS generates neural audio buffer in memory
- ✅ Audio streams to `ffplay` via stdin (zero files written to disk)
- ✅ Smart username shortening works (digits stripped, truncated to 6 chars)
- ✅ Session caching skips repeated username within 30s window
- ✅ Pure ESM imports throughout (no `require`)
- ✅ No stale files (`package-lock.json`, `temp_audio/`) in project root
