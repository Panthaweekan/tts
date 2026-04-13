/**
 * Load, validate, and return the bot configuration from process.env.
 * Throws a descriptive error if any required variable is missing.
 * @returns {Readonly<object>} Frozen config object.
 */
export function loadConfig() {
  const required = ['BOT_USERNAME', 'OAUTH_TOKEN', 'CHANNEL'];
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[config] Missing required environment variable: ${key}`);
    }
  }

  return Object.freeze({
    username: process.env.BOT_USERNAME,
    token: process.env.OAUTH_TOKEN,
    channel: process.env.CHANNEL,

    ttsVoice: process.env.TTS_VOICE || 'th-TH-PremwadeeNeural',
    ttsVolume: process.env.TTS_VOLUME || '-95%',
    nameMaxLength: parseInt(process.env.NAME_MAX_LENGTH) || 6,
    sessionWindowMs: parseInt(process.env.SESSION_WINDOW_MS) || 30000,
    globalCooldownMs: parseInt(process.env.COOLDOWN_GLOBAL_MS) || 2000,
    userCooldownMs: parseInt(process.env.COOLDOWN_USER_MS) || 8000,
    maxQueueSize: 8,
    maxMessageLength: 120,
    minMessageLength: 3,
    botBlacklist: ['nightbot', 'streamelements', 'streamlabs'],
  });
}
