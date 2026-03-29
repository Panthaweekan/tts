# Twitch Chat to TTS Bot Design Spec (Bun Native v2 — Zero-Disk)

## 🎯 Objective
Build a ultra-high-performance Twitch Chat → TTS Bot that automatically reads **ALL chat messages** with high-quality, natural-sounding AI voices, using a zero-disk streaming architecture.
- Reads chat directly from Twitch IRC.
- **Natural AI Voice:** Uses Neural TTS for human-like speech (Microsoft Edge).
- **Fastest Playback:** Streams audio directly from RAM to `ffplay` (Zero Disk I/O).
- **Bun Native:** Optimized for Bun runtime (v1.1+).
- **Smart Username:** Removes digits, truncates length, and caches sessions (30s window).

## ⚡ Design Principles
1. **Zero-Disk Architecture:**
   - Audio is fetched as a memory buffer and piped directly to the player.
   - Saves SSD wear and eliminates file management overhead.
2. **Pure ESM:**
   - Modern JavaScript structure using `import`/`export`.
3. **Deterministic Behavior:**
   - Single-threaded FIFO queue to ensure sequential reading.
4. **Aggressive Fail-Safe Operation:**
   - Strict queue limits, cooldown gates, and text filters to prevent spam.

## 🧱 Architecture
```text
Twitch IRC (tmi.js)
        ↓
Message Filter (Minimum length, Emoji-only block, System ignore)
        ↓
Validation Layer (Blacklist array check)
        ↓
Cooldown Gate (Global & User cooldown mappings)
        ↓
Smart Name Cleaning (Remove digits, Max 6 chars)
        ↓
Session Caching (Skip name if same user speaks within 30s)
        ↓
Priority Router (Subscribers jump to front of queue)
        ↓
Edge TTS Engine (Fetch Neural Audio Buffer)
        ↓
FFplay Player (Memory-Pipe Stdin Streaming)
        ↓
System Desktop Audio → OBS
```

## ⚙️ Constraints (Production Defaults)
| Feature | Value / Setting |
|---------|-----------------|
| **Voice (Thai)** | `th-TH-PremwadeeNeural` (Natural Female) |
| **Volume** | `-95%` (Configurable via .env) |
| **Length Limits** | `Min 3 chars`, `Max 120 chars` |
| **Global Cooldown** | `2000 ms` |
| **User Cooldown** | `8000 ms` |
| **Queue Limit** | `8 items` |
| **Session Window**| `30000 ms` |

## 🚀 Optimization & Security Details
- **Dependency Removal:** Eliminated `dotenv` and `fs-extra` for a leaner `node_modules`.
- **FFmpeg Integration:** Uses `ffplay` for the most responsive audio playback on Windows.
- **Bot Blacklist:** Explicitly ignore nightbot, streamelements, streamlabs.

## 🔥 Prerequisites
- **Bun Runtime** installed.
- **FFmpeg** installed (specifically `ffplay` must be in the PATH).
