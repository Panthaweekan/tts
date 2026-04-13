export interface BotConfig {
  username: string;
  token: string;
  channel: string;
  ttsVoice: string;
  ttsVolume: string;
  nameMaxLength: number;
  sessionWindowMs: number;
  globalCooldownMs: number;
  userCooldownMs: number;
  maxQueueSize: number;
  maxMessageLength: number;
  minMessageLength: number;
  botBlacklist: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  ttsRetryAttempts: number;
  ttsRetryDelayMs: number;
}

/**
 * Load, validate, and return the bot configuration from process.env.
 * Throws a descriptive error if any required variable is missing.
 * @returns Frozen config object.
 */
export function loadConfig(): Readonly<BotConfig> {
  const required = ['BOT_USERNAME', 'OAUTH_TOKEN', 'CHANNEL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[config] Missing required environment variable: ${key}`);
    }
  }

  return Object.freeze({
    username: process.env.BOT_USERNAME as string,
    token: process.env.OAUTH_TOKEN as string,
    channel: process.env.CHANNEL as string,

    ttsVoice: process.env.TTS_VOICE || 'th-TH-PremwadeeNeural',
    ttsVolume: process.env.TTS_VOLUME || '-95%',
    nameMaxLength: parseInt(process.env.NAME_MAX_LENGTH || '0') || 6,
    sessionWindowMs: parseInt(process.env.SESSION_WINDOW_MS || '0') || 30000,
    globalCooldownMs: parseInt(process.env.COOLDOWN_GLOBAL_MS || '0') || 2000,
    userCooldownMs: parseInt(process.env.COOLDOWN_USER_MS || '0') || 8000,
    maxQueueSize: 8,
    maxMessageLength: 120,
    minMessageLength: 3,
    botBlacklist: ['nightbot', 'streamelements', 'streamlabs'],

    // Observability (Phase 2)
    logLevel: (process.env.LOG_LEVEL || 'info').toLowerCase() as BotConfig['logLevel'],
    ttsRetryAttempts: parseInt(process.env.TTS_RETRY_ATTEMPTS || '0') || 3,
    ttsRetryDelayMs: parseInt(process.env.TTS_RETRY_DELAY_MS || '0') || 500,
  });
}
