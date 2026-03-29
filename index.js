import { Communicate } from 'edge-tts-universal';
import tmi from 'tmi.js';

// ⚙️ BASE CONFIG (Environmental with Fallbacks - Bun auto-loads .env)
const USERNAME = Bun.env.BOT_USERNAME;
const TOKEN = Bun.env.OAUTH_TOKEN;
const CHANNEL = Bun.env.CHANNEL;

// TTS Settings
const THAI_VOICE = Bun.env.TTS_VOICE || 'th-TH-PremwadeeNeural';
const TTS_VOLUME = Bun.env.TTS_VOLUME || '-95%';
const NAME_MAX_LENGTH = parseInt(Bun.env.NAME_MAX_LENGTH) || 6;
const SESSION_WINDOW = parseInt(Bun.env.SESSION_WINDOW_MS) || 30000;

// Filters & Limits
const MAX_LENGTH = 120;
const MIN_LENGTH = 3;
const GLOBAL_COOLDOWN = parseInt(Bun.env.COOLDOWN_GLOBAL_MS) || 2000;
const USER_COOLDOWN = parseInt(Bun.env.COOLDOWN_USER_MS) || 8000;
const MAX_QUEUE = 8;
const BOT_BLACKLIST = ['nightbot', 'streamelements', 'streamlabs'];

if (!USERNAME || !TOKEN || !CHANNEL) {
  console.error('[FATAL] Missing environment variables. Please check your .env file.');
  process.exit(1);
}

// STATE
let queue = [];
let isPlaying = false;
let lastGlobal = 0;
const userCooldown = new Map();

// SESSION CACHING
let lastSpeaker = null;
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

/**
 * Clean and shorten the username
 */
function getCleanName(tags) {
  const displayName = tags['display-name'] || tags.username || 'User';
  let clean = displayName.replace(/\d+/g, '').trim();
  
  if (!clean) clean = displayName.substring(0, NAME_MAX_LENGTH);
  
  return clean.length > NAME_MAX_LENGTH ? clean.substring(0, NAME_MAX_LENGTH) : clean;
}

// MAIN LISTENER
client.on('message', (channel, tags, message, self) => {
  if (self) return;

  const username = tags.username;
  const now = Date.now();
  const text = message.trim();

  // FILTERS
  if (!text) return;
  if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) return;
  if (/^[^a-zA-Z0-9ก-ฮ]+$/.test(text)) return; 
  if (tags['message-type'] !== 'chat') return;
  if (BOT_BLACKLIST.includes(username.toLowerCase())) return;

  // Global & User Cooldown
  if (now - lastGlobal < GLOBAL_COOLDOWN) return;
  const lastUser = userCooldown.get(username) || 0;
  if (now - lastUser < USER_COOLDOWN) return;

  // Queue limit
  if (queue.length >= MAX_QUEUE) return;

  // Update cooldown
  lastGlobal = now;
  userCooldown.set(username, now);

  // SESSION CACHING & NAME CLEANING
  let formattedText = '';
  const isRepeatSpeaker = (username === lastSpeaker) && (now - lastSpeakerTime < SESSION_WINDOW);
  
  if (isRepeatSpeaker) {
    formattedText = text;
  } else {
    const cleanName = getCleanName(tags);
    formattedText = `${cleanName}: ${text}`;
  }

  // Update session state
  lastSpeaker = username;
  lastSpeakerTime = now;
  
  if (tags.subscriber) {
    queue.unshift({ text: formattedText });
  } else {
    queue.push({ text: formattedText });
  }
  
  processQueue();
});

// QUEUE PROCESSOR (Zero-Disk Streaming)
async function processQueue() {
  if (isPlaying || queue.length === 0) return;

  isPlaying = true;
  const { text } = queue.shift();

  try {
    console.log(`[TTS] Streaming Audio: ${text}`);
    
    // Generate Speech with Edge TTS
    const communicate = new Communicate(text, { 
      voice: THAI_VOICE,
      volume: TTS_VOLUME
    });
    const audioChunks = [];
    
    for await (const chunk of communicate.stream()) {
      if (chunk.type === 'audio' && chunk.data) {
        audioChunks.push(chunk.data);
      }
    }

    if (audioChunks.length === 0) {
        throw new Error('No audio data received');
    }

    const audioBuffer = Buffer.concat(audioChunks);
    
    // Use ffplay to stream directly from memory via stdin
    // -nodisp: don't show display
    // -autoexit: exit when audio finished
    // -loglevel quiet: don't flood logs
    // -i pipe:0: read from stdin
    const proc = Bun.spawn(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-i", "pipe:0"], {
      stdin: audioBuffer,
    });

    await proc.exited;
    
    isPlaying = false;
    processQueue();

  } catch (err) {
    console.error('[TTS ERROR] Ensure FFmpeg is installed and ffplay is in your PATH. Error:', err);
    isPlaying = false;
    processQueue();
  }
}

// SHUTDOWN
client.on('disconnected', () => {
    console.log('\n🛑 Twitch Client Disconnected.');
});

async function shutdown() {
  console.log('\n🛑 Shutting down...');
  try {
      await client.disconnect();
      process.exit(0);
  } catch (e) {
      process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
