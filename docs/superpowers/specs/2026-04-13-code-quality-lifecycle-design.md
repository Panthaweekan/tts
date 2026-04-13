# Design Spec: Code Quality Lifecycle — Phase 1 Foundation

**Date:** 2026-04-13
**Status:** Approved

---

## Objective

Establish a solid engineering foundation for XantaTTS through an incremental, 5-phase code quality lifecycle. Each phase is independently shippable without disrupting existing functionality.

The current codebase is a working v1.0 (~280 lines, 2 files) with zero tests, no linting, no module boundaries, and all logic colocated in a single `startBot()` closure. Phase 1 corrects this by introducing modular architecture, a test suite, and automated code quality tools.

---

## Approach: Flat Module Split (Approach A)

Decompose `startBot()` into 7 focused modules under `src/`, each with a single responsibility, communicating through plain JS interfaces. Stateful modules use the factory pattern to enable clean test isolation. Stateless modules export pure functions.

---

## Module Architecture

### Dependency Graph

```
bot.js (Orchestrator)
  ├── config.js          ← loaded first, passed to all modules
  ├── filters.js         ← pure, called in message handler
  ├── cooldowns.js       ← factory, called in message handler
  ├── names.js           ← factory, called in message handler
  ├── queue.js           ← factory, drives the TTS pipeline
  └── tts.js             ← async function, called by queue processor
```

### Module Contracts

#### `src/config.js`
- **Pattern:** Pure function
- **Export:** `loadConfig()` → frozen config object
- **Behaviour:** Reads `process.env`, validates required fields (`BOT_USERNAME`, `OAUTH_TOKEN`, `CHANNEL`), applies defaults for optional fields, throws descriptive errors for invalid values. Returns a frozen object so no downstream code accidentally mutates config.
- **State:** None

#### `src/filters.js`
- **Pattern:** Pure functions
- **Exports:** `isValidMessage(text, messageType)`, `isBlacklisted(username, blacklist)`
- **Behaviour:** Encapsulates all message rejection logic — length bounds, emoji-only regex, message type check, blacklist lookup. No side effects.
- **State:** None

#### `src/cooldowns.js`
- **Pattern:** Factory
- **Export:** `createCooldownManager({ globalMs, userMs })` → `{ canSpeak(username): boolean, record(username): void }`
- **Behaviour:** Tracks last-global and per-user timestamps. `canSpeak()` returns false if either cooldown is active. `record()` updates both clocks. Split into two methods so message handler logic is explicit.
- **State:** Internal `Map` + `lastGlobal` timestamp (encapsulated)

#### `src/names.js`
- **Pattern:** Factory
- **Export:** `createNameManager({ maxLen, sessionMs })` → `{ format(tags): string }`
- **Behaviour:** `format()` determines if the speaker is a repeat within the session window. If yes, returns just the message text prefix. If no, strips digits from display name, truncates to `maxLen`, prefixes with `name: `. Updates internal session state on every call.
- **State:** Internal `lastSpeaker` + `lastSpeakerTime` (encapsulated)

#### `src/tts.js`
- **Pattern:** Async function
- **Export:** `speak(text, { voice, volume })` → `Promise<void>`
- **Behaviour:** Calls Edge TTS, collects audio chunks into a `Buffer`, spawns `ffplay` with that buffer on stdin. Throws on empty audio response. No queue logic — purely "turn text into sound".
- **State:** None

#### `src/queue.js`
- **Pattern:** Factory
- **Export:** `createQueue({ maxSize, processor })` → `{ enqueue(item, { priority }): void }`
- **Behaviour:** Maintains an array of pending items. `enqueue()` with `priority: true` unshifts (subscriber messages); otherwise pushes. Respects `maxSize` cap silently (drops excess). Runs the `processor(item)` function sequentially — one at a time — using an `isProcessing` lock. The `processor` callback is injected (dependency injection), making the queue testable without real TTS.
- **State:** Internal array + `isProcessing` lock (encapsulated)

#### `src/bot.js`
- **Pattern:** Async function (orchestrator)
- **Export:** `startBot()` → `Promise<void>`
- **Behaviour:** Calls `loadConfig()`, instantiates all factories, creates the tmi.js client, wires message events to the message pipeline (filters → cooldowns → names → queue). Handles connect/disconnect lifecycle and graceful shutdown on SIGINT/SIGTERM.
- **State:** Owns the Twitch client reference

---

## Testing Strategy

### Framework

`bun test` — built-in, Jest-compatible, zero additional dependencies.

### Test File Map

| File | Module | Coverage Goal |
|---|---|---|
| `tests/config.test.js` | `src/config.js` | Missing required vars, defaults, frozen object |
| `tests/filters.test.js` | `src/filters.js` | Too short, too long, emoji-only, wrong type, blacklisted |
| `tests/cooldowns.test.js` | `src/cooldowns.js` | Global blocks, per-user blocks, expiry after window |
| `tests/names.test.js` | `src/names.js` | Digit stripping, truncation, session cache hit/miss |
| `tests/queue.test.js` | `src/queue.js` | Priority ordering, max size cap, sequential processing |

### Out of Scope in Phase 1

- `tts.js` — requires mocking Edge TTS + subprocess
- `bot.js` — integration-level, requires mocking tmi.js

Both deferred to Phase 2 when mocking infrastructure is established.

### Target

15+ test cases, 80%+ coverage on the 5 in-scope modules.

---

## Linting & Formatting

### Tools

- **ESLint v9+** — flat config format (`eslint.config.js`)
- **Prettier** — opinionated formatter (`.prettierrc`)

### Prettier Config

```json
{
  "singleQuote": true,
  "semi": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

Matches existing code style — zero reformatting churn on `launcher.js`.

### ESLint Rules (lean)

```js
rules: {
  "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  "no-console": "off",
  "prefer-const": "error",
  "no-var": "error",
  "eqeqeq": "error",
}
```

### Scripts

```json
"lint":           "eslint src/ tests/",
"format":         "prettier --write src/ tests/",
"format:check":   "prettier --check src/ tests/",
"test":           "bun test",
"precommit":      "bun run lint && bun run format:check && bun run test"
```

---

## Project Structure (After Phase 1)

```
tts/
├── src/
│   ├── config.js
│   ├── filters.js
│   ├── cooldowns.js
│   ├── names.js
│   ├── tts.js
│   ├── queue.js
│   └── bot.js
├── tests/
│   ├── config.test.js
│   ├── filters.test.js
│   ├── cooldowns.test.js
│   ├── names.test.js
│   └── queue.test.js
├── index.js               # Thin entry: import { startBot } from './src/bot.js'
├── launcher.js            # Unchanged
├── eslint.config.js       # NEW
├── .prettierrc            # NEW
├── package.json           # Modified: dev deps + scripts
├── .env / .env.example
├── .gitignore
└── README.md              # Updated structure section
```

---

## Files Changed

| File | Status | Notes |
|---|---|---|
| `src/config.js` | NEW | Config loading + validation |
| `src/filters.js` | NEW | Pure message validation |
| `src/cooldowns.js` | NEW | Factory: cooldown tracking |
| `src/names.js` | NEW | Factory: name formatting + session |
| `src/tts.js` | NEW | Edge TTS + ffplay pipeline |
| `src/queue.js` | NEW | Factory: priority queue + processor |
| `src/bot.js` | NEW | Orchestrator |
| `tests/config.test.js` | NEW | |
| `tests/filters.test.js` | NEW | |
| `tests/cooldowns.test.js` | NEW | |
| `tests/names.test.js` | NEW | |
| `tests/queue.test.js` | NEW | |
| `eslint.config.js` | NEW | |
| `.prettierrc` | NEW | |
| `index.js` | MODIFY | Thin entry point only |
| `package.json` | MODIFY | Dev deps + scripts |
| `README.md` | MODIFY | Updated structure section |
| `launcher.js` | UNCHANGED | |

---

## Full Lifecycle Roadmap

| Phase | Focus | Key Deliverables |
|---|---|---|
| **1 — Foundation** | Modular architecture + tests + linting | `src/` modules, `bun test`, ESLint + Prettier |
| **2 — Observability** | Structured logging + error resilience | Log levels, TTS retry logic, health reporting |
| **3 — CI/CD** | Automated quality gates | GitHub Actions: lint + test + build on push/PR |
| **4 — TypeScript** | Type safety | `.js` → `.ts`, interfaces for all module boundaries |
| **5 — Release** | Automated delivery | Semver, changelog, automated .exe builds on tag |

---

## Success Criteria (Phase 1)

- [ ] All 7 `src/` modules exist with single-responsibility
- [ ] `bun test` runs 15+ test cases, all passing
- [ ] `bun run lint` passes with zero errors
- [ ] `bun run format:check` passes
- [ ] `launcher.js` still works identically (zero behaviour change)
- [ ] `.exe` builds and runs correctly after refactor
