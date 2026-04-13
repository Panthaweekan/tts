# Changelog

All notable changes to XantaTTS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-13

### Added
- **Modular architecture** — Decomposed monolithic bot into 9 focused modules (`config`, `filters`, `cooldowns`, `names`, `queue`, `tts`, `bot`, `logger`, `health`).
- **Structured logging** — Namespaced, level-gated, colored log output via `LOG_LEVEL` env var.
- **TTS retry logic** — Exponential backoff (configurable via `TTS_RETRY_ATTEMPTS` / `TTS_RETRY_DELAY_MS`).
- **Health tracking** — Session metrics (messages, TTS successes/errors, retries, uptime) printed on shutdown.
- **53 automated tests** covering all core logic.
- **CI/CD pipeline** — GitHub Actions for lint, format, typecheck, and test on every push/PR.
- **TypeScript migration** — Full type safety with strict mode and `tsc --noEmit` in CI.
- **Release automation** — Tag-triggered workflow builds `XantaTTS.exe` and publishes to GitHub Releases.
- **Zero-disk streaming** — Audio pipes directly to `ffplay` without touching the filesystem.
- **Priority queue** — Subscriber messages jump to the front.
- **Smart name formatting** — Session caching, digit stripping, length truncation.
- **Anti-spam** — Global + per-user cooldowns, bot blacklist, message validation.
