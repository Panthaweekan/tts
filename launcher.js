import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { spawn } from "bun";
import { startBot } from "./index.js";

// Resolve project root at RUNTIME
// In script mode: import.meta.path ends with ".js" → use import.meta.dir (correct source dir)
// In compiled .exe: import.meta.path is a virtual bunfs path → use dirname(process.execPath)
const isCompiled = typeof Bun !== "undefined" && !import.meta.path.endsWith(".js");
const ROOT        = isCompiled ? dirname(process.execPath) : import.meta.dir;
const envPath     = join(ROOT, ".env");
const examplePath = join(ROOT, ".env.example");

// 🛠️ UI helpers
const info    = (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`);
const success = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const warn    = (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const error   = (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`);

function mask(token) {
  if (token.length <= 6) return "******";
  return token.substring(0, 3) + "***" + token.substring(token.length - 3);
}

/** Parse a .env file and return a plain object */
function parseEnv(content) {
  const vars = {};
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

/** Inject an env object into process.env */
function injectEnv(vars) {
  for (const [key, val] of Object.entries(vars)) {
    process.env[key] = val;
  }
}

async function setup() {
  console.log("\n\x1b[35m=== 🚀 Xanta TTS Smart Launcher ===\x1b[0m\n");

  const FORCE_AUTH = process.argv.includes("--auth");

  // 1. Ensure .env exists
  if (!existsSync(envPath)) {
    info(".env not found. Creating from template...");
    if (!existsSync(examplePath)) {
      error(".env.example missing! Please restore it.");
      process.exit(1);
    }
    writeFileSync(envPath, readFileSync(examplePath, "utf8"));
    success(".env created from template.");
  }

  // 2. Load & parse .env
  let envContent = readFileSync(envPath, "utf8");
  let envVars    = parseEnv(envContent);

  const username = envVars["BOT_USERNAME"];
  const channel  = envVars["CHANNEL"];
  let   token    = envVars["OAUTH_TOKEN"];

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

    // Twitch CLI may write to stdout or stderr
    const authProc = spawn(["twitch", "token", "-u", "-s", "chat:read chat:edit"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdoutText, stderrText] = await Promise.all([
      new Response(authProc.stdout).text(),
      new Response(authProc.stderr).text(),
    ]);
    await authProc.exited;

    const output     = stdoutText + "\n" + stderrText;
    const tokenMatch = output.match(/User Access Token:\s*(\S+)/);

    if (!tokenMatch) {
      error("Could not extract token from Twitch CLI output.");
      info('Please run manually: twitch token -u -s "chat:read chat:edit"');
      process.exit(1);
    }

    const rawToken      = tokenMatch[1];
    const formattedToken = rawToken.startsWith("oauth:") ? rawToken : `oauth:${rawToken}`;

    // Persist to .env
    envContent = envContent.replace(/^OAUTH_TOKEN=.*$/m, `OAUTH_TOKEN=${formattedToken}`);
    writeFileSync(envPath, envContent);

    // Update local parse result for injection below
    envVars["OAUTH_TOKEN"] = formattedToken;

    success(`Token saved: ${mask(rawToken)}`);
  } else {
    const cleanToken = token.startsWith("oauth:") ? token.slice(6) : token;
    info(`Using existing token: ${mask(cleanToken)}`);
  }

  // 5. Inject all .env values into process.env (critical for compiled .exe)
  injectEnv(envVars);

  // 6. Start the bot directly in the same process
  console.log();
  success("Launching TTS Bot...\n");
  await startBot();
}

setup().catch((err) => {
  error(`Launcher failed: ${err.message}`);
  process.exit(1);
});
