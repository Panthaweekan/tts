import type { ChatUserstate } from 'tmi.js';

export interface NameManagerOptions {
  maxLen: number;
  sessionMs: number;
}

export interface NameManager {
  format(tags: ChatUserstate, text: string): string;
}

/**
 * Creates a name manager that formats speaker names and tracks session state.
 * @param options
 */
export function createNameManager({ maxLen, sessionMs }: NameManagerOptions): NameManager {
  let lastSpeaker: string | null | undefined = null;
  let lastSpeakerTime = 0;

  function getCleanName(tags: ChatUserstate): string {
    const displayName = tags['display-name'] || tags.username || 'User';
    let clean = displayName.replace(/\d+/g, '').trim();
    if (!clean) clean = (tags.username || displayName).substring(0, maxLen);
    return clean.length > maxLen ? clean.substring(0, maxLen) : clean;
  }

  return {
    format(tags: ChatUserstate, text: string): string {
      const username = tags.username;
      const now = Date.now();
      const isRepeat = username === lastSpeaker && now - lastSpeakerTime < sessionMs;

      lastSpeaker = username;
      lastSpeakerTime = now;

      return isRepeat ? text : `${getCleanName(tags)}: ${text}`;
    },
  };
}
