import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "bun";
import { startBot } from "./src/bot.ts";
import { authenticateWithTwitch } from "./src/auth.ts";

// ─── Resolve project root at RUNTIME ────────────────────────────────────────
// Script mode: import.meta.path ends with ".ts" → use import.meta.dir
// Compiled .exe: virtual bunfs path → use dirname(process.execPath)
const isCompiled =
  typeof Bun !== "undefined" && !import.meta.path.endsWith(".ts");
const ROOT = isCompiled ? dirname(process.execPath) : import.meta.dir;
const envPath = join(ROOT, ".env");

// ─── UI helpers ─────────────────────────────────────────────────────────────
const info = (msg: string) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`);
const success = (msg: string) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const warn = (msg: string) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const err = (msg: string) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`);

function mask(token: string): string {
  if (token.length <= 6) return "******";
  return token.substring(0, 3) + "***" + token.substring(token.length - 3);
}

// ─── Embedded .env template ─────────────────────────────────────────────────
const ENV_TEMPLATE = `# XantaTTS Configuration
# Generated automatically by the launcher

# Twitch Credentials
TWITCH_CLIENT_ID=
BOT_USERNAME=
OAUTH_TOKEN=
CHANNEL=

# TTS Settings
TTS_VOICE=th-TH-PremwadeeNeural
TTS_VOLUME=-95%

# Username Display
NAME_MAX_LENGTH=6
SESSION_WINDOW_MS=30000

# Cooldowns
COOLDOWN_GLOBAL_MS=2000
COOLDOWN_USER_MS=8000

# Observability
LOG_LEVEL=info
TTS_RETRY_ATTEMPTS=3
TTS_RETRY_DELAY_MS=500
`;

// ─── stdin prompt ───────────────────────────────────────────────────────────
async function prompt(question: string): Promise<string> {
  process.stdout.write(`\x1b[36m${question}\x1b[0m`);

  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];

    const onData = (data: Buffer) => {
      chunks.push(data);
      const text = Buffer.concat(chunks).toString();
      if (text.includes("\n")) {
        process.stdin.removeListener("data", onData);
        process.stdin.pause();
        resolve(text.trim());
      }
    };

    process.stdin.resume();
    process.stdin.on("data", onData);
  });
}

async function promptYesNo(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (Y/n): `);
  return answer.toLowerCase() !== "n";
}

// ─── .env helpers ───────────────────────────────────────────────────────────
function parseEnv(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    vars[key] = val;
  }
  return vars;
}

function setEnvValue(
  content: string,
  key: string,
  value: string,
): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  return content + `\n${key}=${value}`;
}

function injectEnv(vars: Record<string, string>): void {
  for (const [key, val] of Object.entries(vars)) {
    process.env[key] = val;
  }
}

// ─── Prerequisite checks ───────────────────────────────────────────────────
async function checkFFmpeg(): Promise<boolean> {
  try {
    const proc = spawn(["ffplay", "-version"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}

async function ensureFFmpeg(): Promise<void> {
  info("Checking prerequisites...");

  if (await checkFFmpeg()) {
    success("FFmpeg (ffplay) found");
    return;
  }

  warn("FFmpeg (ffplay) not found — required for audio playback");

  const install = await promptYesNo("  Install FFmpeg now via winget?");

  if (install) {
    info("Installing FFmpeg... (this may take a moment)");
    const proc = spawn(["winget", "install", "ffmpeg", "--accept-source-agreements", "--accept-package-agreements"], {
      stdout: "inherit",
      stderr: "inherit",
    });
    await proc.exited;

    if (await checkFFmpeg()) {
      success("FFmpeg installed successfully!");
      return;
    }

    warn("FFmpeg installed but ffplay not found in PATH.");
    info("You may need to restart your terminal or PC for PATH changes to take effect.");
    info("Alternatively, download FFmpeg manually: https://ffmpeg.org/download.html");
    process.exit(1);
  } else {
    info("Please install FFmpeg manually:");
    info("  → winget install ffmpeg");
    info("  → Or download from https://ffmpeg.org/download.html");
    process.exit(1);
  }
}

// ─── Main setup flow ────────────────────────────────────────────────────────
async function setup() {
  console.log("\n\x1b[35m=== 🚀 Xanta TTS Launcher ===\x1b[0m\n");

  const FORCE_AUTH = process.argv.includes("--auth");

  // 1. Check FFmpeg
  await ensureFFmpeg();
  console.log();

  // 2. Ensure .env exists
  if (!existsSync(envPath)) {
    writeFileSync(envPath, ENV_TEMPLATE);
    info("Created new configuration file.");
  }

  // 3. Load & parse .env
  let envContent = readFileSync(envPath, "utf8");
  let envVars = parseEnv(envContent);

  // 4. Interactive credential setup
  let clientId = envVars["TWITCH_CLIENT_ID"];
  let username = envVars["BOT_USERNAME"];
  let channel = envVars["CHANNEL"];

  if (!clientId || clientId === "your_client_id") {
    console.log("\x1b[35m— Twitch Developer Setup —\x1b[0m\n");
    info("To keep your account secure, you must use your own Twitch app.");
    console.log("  1. Go to \x1b[36mhttps://dev.twitch.tv/console\x1b[0m");
    console.log("  2. Click 'Register Your Application'");
    console.log("  3. Name: anything (e.g., XantaTTS)");
    console.log("  4. OAuth Redirect URLs: \x1b[32mhttp://localhost:3000/callback\x1b[0m");
    console.log("  5. Category: Chat Bot");
    console.log("  6. Click Create, then Manage, and copy the Client ID.");
    console.log();
    clientId = await prompt("  Enter your Client ID: ");
    envContent = setEnvValue(envContent, "TWITCH_CLIENT_ID", clientId);
    writeFileSync(envPath, envContent);
    console.log();
  }

  if (!username) {
    if (clientId) console.log("\x1b[35m— First-Time Setup —\x1b[0m\n");
    username = await prompt("  Enter your Twitch bot username: ");
    envContent = setEnvValue(envContent, "BOT_USERNAME", username);
    writeFileSync(envPath, envContent);
  }

  if (!channel) {
    channel = await prompt("  Enter the Twitch channel to join: ");
    envContent = setEnvValue(envContent, "CHANNEL", channel);
    writeFileSync(envPath, envContent);
  }

  if (!clientId || !username || !channel) {
    err("Client ID, Bot username, and channel are required.");
    process.exit(1);
  }

  // Re-parse after writes
  envVars = parseEnv(envContent);

  // 5. Authentication
  let token = envVars["OAUTH_TOKEN"];
  const isInvalidToken =
    !token || token === "oauth:your_oauth_token" || token.length < 10;

  if (isInvalidToken || FORCE_AUTH) {
    if (FORCE_AUTH) info("Refreshing Twitch token...");
    else {
      console.log();
      info("Twitch authorization required.");
    }

    console.log();
    try {
      token = await authenticateWithTwitch(clientId);
    } catch (e: any) {
      err(e.message || "Authorization failed.");
      process.exit(1);
    }

    // Save token to .env
    envContent = setEnvValue(envContent, "OAUTH_TOKEN", token);
    writeFileSync(envPath, envContent);
    envVars = parseEnv(envContent);

    const cleanToken = token.startsWith("oauth:") ? token.slice(6) : token;
    success(`Token saved: ${mask(cleanToken)}`);
  } else {
    const cleanToken = token.startsWith("oauth:") ? token.slice(6) : token;
    info(`Using existing token: ${mask(cleanToken)}`);
  }

  // 6. Inject all .env values into process.env
  injectEnv(envVars);

  // 7. Start the bot
  console.log();
  success("Launching TTS Bot...\n");
  await startBot();
}

setup().catch((e: Error | unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  err(`Launcher failed: ${msg}`);
  process.exit(1);
});
