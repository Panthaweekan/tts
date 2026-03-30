import { spawn } from "bun";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(import.meta.dir, ".env");
const examplePath = join(import.meta.dir, ".env.example");

// 🛠️ Helper: UI
const info = (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`);
const success = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const warn = (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const error = (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`);

function mask(token) {
  if (token.length <= 6) return "******";
  return token.substring(0, 3) + "***" + token.substring(token.length - 3);
}

async function setup() {
  console.log("\n\x1b[35m=== 🚀 Xanta TTS Smart Launcher ===\x1b[0m\n");

  const FORCE_AUTH = process.argv.includes("--auth");

  // 1. Check if .env exists
  if (!existsSync(envPath)) {
    info(".env not found. Creating from template...");
    if (!existsSync(examplePath)) {
      error(".env.example missing! Please restore it.");
      process.exit(1);
    }
    writeFileSync(envPath, readFileSync(examplePath, "utf8"));
    success(".env created from template.");
  }

  // 2. Load .env
  let envContent = readFileSync(envPath, "utf8");
  const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
    return match ? match[1].trim() : null;
  };

  const username = getEnv("BOT_USERNAME");
  const channel = getEnv("CHANNEL");
  let token = getEnv("OAUTH_TOKEN");

  // 3. Validate basic config
  if (!username || username === "your_bot_username" || !channel || channel === "your_channel_name") {
    warn("Twitch credentials missing.");
    info("Open .env and set BOT_USERNAME and CHANNEL, then run this again.");
    process.exit(1);
  }

  // 4. Auto-Auth if needed
  const isInvalidToken = !token || token === "oauth:your_oauth_token" || token.length < 10;

  if (isInvalidToken || FORCE_AUTH) {
    if (FORCE_AUTH) info("Refreshing Twitch token...");
    else warn("Token missing or invalid. Starting authentication...");

    info("Opening browser for Twitch authorization...");
    console.log();

    // Twitch CLI outputs token info to stderr, so capture both streams
    const authProc = spawn(["twitch", "token", "-u", "-s", "chat:read chat:edit"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdoutText, stderrText] = await Promise.all([
      new Response(authProc.stdout).text(),
      new Response(authProc.stderr).text(),
    ]);
    await authProc.exited;

    // Twitch CLI may output to either stream
    const output = stdoutText + "\n" + stderrText;

    // Parse the token from CLI output
    const tokenMatch = output.match(/User Access Token:\s*(\S+)/);

    if (!tokenMatch) {
      error("Could not extract token from Twitch CLI output.");
      info("Please run manually: twitch token -u -s \"chat:read chat:edit\"");
      process.exit(1);
    }

    const rawToken = tokenMatch[1];
    const formattedToken = rawToken.startsWith("oauth:") ? rawToken : `oauth:${rawToken}`;

    // Update .env
    envContent = envContent.replace(/^OAUTH_TOKEN=.*$/m, `OAUTH_TOKEN=${formattedToken}`);
    writeFileSync(envPath, envContent);

    success(`Token saved: ${mask(rawToken)}`);
  } else {
    const cleanToken = token.startsWith("oauth:") ? token.slice(6) : token;
    info(`Using existing token: ${mask(cleanToken)}`);
  }

  // 5. Launch bot
  console.log();
  success("Launching TTS Bot...\n");

  const bot = spawn(["bun", "index.js"], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
    cwd: import.meta.dir,
  });

  await bot.exited;
}

setup().catch((err) => {
  error(`Launcher failed: ${err.message}`);
  process.exit(1);
});
