import { Communicate } from 'edge-tts-universal';

/**
 * Synthesize text to speech and play it through ffplay (zero-disk streaming).
 * @param {string} text - The text to speak.
 * @param {{ voice: string, volume: string }} options
 * @returns {Promise<void>}
 * @throws {Error} If no audio data is received.
 */
export async function speak(text, { voice, volume }) {
  const communicate = new Communicate(text, { voice, volume });
  const audioChunks = [];

  for await (const chunk of communicate.stream()) {
    if (chunk.type === 'audio' && chunk.data) audioChunks.push(chunk.data);
  }

  if (audioChunks.length === 0) throw new Error('No audio data received from Edge TTS');

  const audioBuffer = Buffer.concat(audioChunks);
  const proc = Bun.spawn(['ffplay', '-nodisp', '-autoexit', '-loglevel', 'quiet', '-i', 'pipe:0'], {
    stdin: audioBuffer,
  });
  await proc.exited;
}
