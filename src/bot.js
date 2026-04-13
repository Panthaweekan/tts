import tmi from 'tmi.js';
import { loadConfig } from './config.js';
import { setLogLevel, createLogger } from './logger.js';
import { createHealthTracker } from './health.js';
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

  // Initialize observability
  setLogLevel(config.logLevel);
  const log = createLogger('bot');
  const health = createHealthTracker();

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
      log.info(`Streaming: ${text}`);
      await speak(text, {
        voice: config.ttsVoice,
        volume: config.ttsVolume,
        retryAttempts: config.ttsRetryAttempts,
        retryDelayMs: config.ttsRetryDelayMs,
      });
      health.recordTtsSuccess();
    },
    onError: () => health.recordTtsError(),
  });

  const client = new tmi.Client({
    identity: { username: config.username, password: config.token },
    channels: [config.channel],
  });

  log.info('Connecting to Twitch IRC...');

  client.connect().catch((err) => {
    log.error('Failed to connect to Twitch IRC:', err);
    process.exit(1);
  });

  client.on('connected', () => {
    health.markConnected();
    log.info('Zero-Disk Streaming Active');
    log.info(`Channel: ${config.channel}`);
    log.info(`Voice: ${config.ttsVoice} | Volume: ${config.ttsVolume}`);
    log.debug(`Retry: ${config.ttsRetryAttempts} attempts, ${config.ttsRetryDelayMs}ms base delay`);
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

    health.recordMessage();

    const formattedText = names.format(tags, text);
    const isSubscriber = Boolean(tags.subscriber);

    log.debug(`Queued [${isSubscriber ? 'SUB' : 'REG'}]: ${formattedText}`);
    queue.enqueue({ text: formattedText }, { priority: isSubscriber });
  });

  client.on('disconnected', () => {
    const status = health.getStatus();
    log.warn('Twitch Client Disconnected.');
    log.info(
      `Session: ${status.messageCount} msgs, ` +
        `${status.ttsSuccessCount} played, ` +
        `${status.ttsErrorCount} errors, ` +
        `${status.retryCount} retries, ` +
        `${status.uptimeMinutes}min uptime`
    );
  });

  async function shutdown() {
    const status = health.getStatus();
    log.info(
      `Shutting down — ${status.messageCount} msgs, ` +
        `${status.ttsSuccessCount} played, ` +
        `${status.ttsErrorCount} errors`
    );
    try {
      await client.disconnect();
    } catch (_) {}
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
