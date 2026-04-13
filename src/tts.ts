import { Communicate } from 'edge-tts-universal';
import { createLogger } from './logger.ts';

const log = createLogger('tts');

export interface SpeakOptions {
  voice: string;
  volume: string;
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * Synthesize text to speech and play it through ffplay (zero-disk streaming).
 * Retries on failure with exponential backoff.
 *
 * @param text - The text to speak.
 * @param options
 * @throws If all retry attempts fail.
 */
export async function speak(
  text: string,
  { voice, volume, retryAttempts = 3, retryDelayMs = 500 }: SpeakOptions
): Promise<void> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const communicate = new Communicate(text, { voice, volume });
      const audioChunks = [];

      for await (const chunk of communicate.stream()) {
        if (chunk.type === 'audio' && chunk.data) audioChunks.push(chunk.data);
      }

      if (audioChunks.length === 0) throw new Error('No audio data received from Edge TTS');

      const audioBuffer = Buffer.concat(audioChunks);
      const proc = Bun.spawn(
        ['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet', '-i', 'pipe:0'],
        { stdin: audioBuffer }
      );
      await proc.exited;

      return; // success — exit the retry loop
    } catch (err) {
      lastError = err;

      if (attempt < retryAttempts) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        log.warn(`Retry ${attempt}/${retryAttempts} for: "${text}" (waiting ${delay}ms)`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // All attempts exhausted
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  log.error(`Failed after ${retryAttempts} attempts: ${msg}`);
  throw lastError;
}
