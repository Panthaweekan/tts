import tmi from 'tmi.js';
import { loadConfig } from './config.js';
import { isValidMessage, isBlacklisted } from './filters.js';
import { createCooldownManager } from './cooldowns.js';
import { createNameManager } from './names.js';
import { createQueue } from './queue.js';
import { speak } from './tts.js';

/**
 * Start the TTS bot. Loads config, wires all modules, connects to Twitch IRC.
 * @returns {Promise<void>}
 */
export async function startBot() {
  const config = loadConfig();

  const cooldowns = createCooldownManager({
    globalMs: config.globalCooldownMs,
    userMs: config.userCooldownMs,
  });

  const names = createNameManager({
    maxLen: config.nameMaxLength,
    sessionMs: config.sessionWindowMs,
  });

  const queue = createQueue({
    maxSize: config.maxQueueSize,
    processor: async ({ text }) => {
      console.log(`[TTS] Streaming Audio: ${text}`);
      await speak(text, { voice: config.ttsVoice, volume: config.ttsVolume });
    },
  });

  const client = new tmi.Client({
    identity: { username: config.username, password: config.token },
    channels: [config.channel],
  });

  console.log('🔗 Connecting to Twitch IRC...');

  client.connect().catch((err) => {
    console.error('[FATAL] Failed to connect to Twitch IRC:', err);
    process.exit(1);
  });

  client.on('connected', () => {
    console.log('✅ [BUN NATIVE V2] Zero-Disk Streaming Active');
    console.log(`✅ [TARGET] ${config.channel}`);
    console.log(`🔊 [SETTING] Voice: ${config.ttsVoice} | Volume: ${config.ttsVolume}`);
  });

  client.on('message', (_channel, tags, message, self) => {
    if (self) return;

    const text = message.trim();
    const username = tags.username;
    const messageType = tags['message-type'];

    if (
      !isValidMessage(text, messageType, {
        minLength: config.minMessageLength,
        maxLength: config.maxMessageLength,
      })
    )
      return;

    if (isBlacklisted(username, config.botBlacklist)) return;

    if (!cooldowns.canSpeak(username)) return;
    cooldowns.record(username);

    const formattedText = names.format(tags, text);
    const isSubscriber = Boolean(tags.subscriber);

    queue.enqueue({ text: formattedText }, { priority: isSubscriber });
  });

  client.on('disconnected', () => console.log('\n🛑 Twitch Client Disconnected.'));

  async function shutdown() {
    console.log('\n🛑 Shutting down...');
    try {
      await client.disconnect();
    } catch (_) {}
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
