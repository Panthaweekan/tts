import { Communicate } from 'edge-tts-universal';
import tmi from 'tmi.js';

/**
 * Start the TTS bot. Call this from the launcher after env vars are set.
 */
export async function startBot() {
  // ⚙️ CONFIG — read from process.env (injected by launcher)
  const USERNAME = process.env.BOT_USERNAME;
  const TOKEN    = process.env.OAUTH_TOKEN;
  const CHANNEL  = process.env.CHANNEL;

  // TTS Settings
  const THAI_VOICE   = process.env.TTS_VOICE || 'th-TH-PremwadeeNeural';
  const TTS_VOLUME   = process.env.TTS_VOLUME || '-95%';
  const NAME_MAX_LEN = parseInt(process.env.NAME_MAX_LENGTH) || 6;
  const SESSION_WIN  = parseInt(process.env.SESSION_WINDOW_MS) || 30000;

  // Anti-spam
  const MAX_LENGTH     = 120;
  const MIN_LENGTH     = 3;
  const GLOBAL_COOLDOWN = parseInt(process.env.COOLDOWN_GLOBAL_MS) || 2000;
  const USER_COOLDOWN  = parseInt(process.env.COOLDOWN_USER_MS) || 8000;
  const MAX_QUEUE      = 8;
  const BOT_BLACKLIST  = ['nightbot', 'streamelements', 'streamlabs'];

  if (!USERNAME || !TOKEN || !CHANNEL) {
    console.error('[FATAL] Missing environment variables. Please check your .env file.');
    process.exit(1);
  }

  // STATE
  let queue    = [];
  let isPlaying = false;
  let lastGlobal = 0;
  const userCooldown = new Map();

  // SESSION CACHING
  let lastSpeaker     = null;
  let lastSpeakerTime = 0;

  // CONNECT
  const client = new tmi.Client({
    identity: { username: USERNAME, password: TOKEN },
    channels: [CHANNEL],
  });

  console.log('🔗 Connecting to Twitch IRC (Bun Native V2 - Zero Disk)...');

  client.connect().catch(err => {
    console.error('[FATAL] Failed to connect to Twitch IRC:', err);
    process.exit(1);
  });

  client.on('connected', () => {
    console.log('✅ [BUN NATIVE V2] Zero-Disk Streaming Active');
    console.log(`✅ [TARGET] ${CHANNEL}`);
    console.log(`🔊 [SETTING] Voice: ${THAI_VOICE} | Volume: ${TTS_VOLUME}`);
  });

  function getCleanName(tags) {
    const displayName = tags['display-name'] || tags.username || 'User';
    let clean = displayName.replace(/\d+/g, '').trim();
    if (!clean) clean = displayName.substring(0, NAME_MAX_LEN);
    return clean.length > NAME_MAX_LEN ? clean.substring(0, NAME_MAX_LEN) : clean;
  }

  client.on('message', (channel, tags, message, self) => {
    if (self) return;

    const username = tags.username;
    const now  = Date.now();
    const text = message.trim();

    if (!text) return;
    if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) return;
    if (/^[^a-zA-Z0-9ก-ฮ]+$/.test(text)) return;
    if (tags['message-type'] !== 'chat') return;
    if (BOT_BLACKLIST.includes(username.toLowerCase())) return;
    if (now - lastGlobal < GLOBAL_COOLDOWN) return;

    const lastUser = userCooldown.get(username) || 0;
    if (now - lastUser < USER_COOLDOWN) return;
    if (queue.length >= MAX_QUEUE) return;

    lastGlobal = now;
    userCooldown.set(username, now);

    const isRepeat = (username === lastSpeaker) && (now - lastSpeakerTime < SESSION_WIN);
    const formattedText = isRepeat ? text : `${getCleanName(tags)}: ${text}`;

    lastSpeaker     = username;
    lastSpeakerTime = now;

    if (tags.subscriber) queue.unshift({ text: formattedText });
    else                 queue.push({ text: formattedText });

    processQueue();
  });

  // Queue processor — loop-based (avoids recursive call stack buildup)
  async function processQueue() {
    if (isPlaying) return;
    isPlaying = true;

    while (queue.length > 0) {
      const { text } = queue.shift();
      try {
        console.log(`[TTS] Streaming Audio: ${text}`);
        const communicate = new Communicate(text, { voice: THAI_VOICE, volume: TTS_VOLUME });
        const audioChunks = [];

        for await (const chunk of communicate.stream()) {
          if (chunk.type === 'audio' && chunk.data) audioChunks.push(chunk.data);
        }

        if (audioChunks.length === 0) throw new Error('No audio data received');

        const audioBuffer = Buffer.concat(audioChunks);
        const proc = Bun.spawn(
          ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet', '-i', 'pipe:0'],
          { stdin: audioBuffer }
        );
        await proc.exited;
      } catch (err) {
        console.error('[TTS ERROR] Ensure FFmpeg is installed. Error:', err.message);
      }
    }

    isPlaying = false;
  }

  client.on('disconnected', () => console.log('\n🛑 Twitch Client Disconnected.'));

  async function shutdown() {
    console.log('\n🛑 Shutting down...');
    try { await client.disconnect(); } catch (_) {}
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
