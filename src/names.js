/**
 * Creates a name manager that formats speaker names and tracks session state.
 * @param {{ maxLen: number, sessionMs: number }} options
 * @returns {{ format(tags: object, text: string): string }}
 */
export function createNameManager({ maxLen, sessionMs }) {
  let lastSpeaker = null;
  let lastSpeakerTime = 0;

  function getCleanName(tags) {
    const displayName = tags['display-name'] || tags.username || 'User';
    let clean = displayName.replace(/\d+/g, '').trim();
    if (!clean) clean = (tags.username || displayName).substring(0, maxLen);
    return clean.length > maxLen ? clean.substring(0, maxLen) : clean;
  }

  return {
    format(tags, text) {
      const username = tags.username;
      const now = Date.now();
      const isRepeat = username === lastSpeaker && now - lastSpeakerTime < sessionMs;

      lastSpeaker = username;
      lastSpeakerTime = now;

      return isRepeat ? text : `${getCleanName(tags)}: ${text}`;
    },
  };
}
