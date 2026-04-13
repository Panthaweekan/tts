/**
 * Creates a cooldown manager that enforces a global and per-user cooldown.
 * @param {{ globalMs: number, userMs: number }} options
 * @returns {{ canSpeak(username: string): boolean, record(username: string): void }}
 */
export function createCooldownManager({ globalMs, userMs }) {
  let lastGlobal = 0;
  const userTimestamps = new Map();

  return {
    canSpeak(username) {
      const now = Date.now();
      if (now - lastGlobal < globalMs) return false;
      const lastUser = userTimestamps.get(username) || 0;
      if (now - lastUser < userMs) return false;
      return true;
    },

    record(username) {
      const now = Date.now();
      lastGlobal = now;
      userTimestamps.set(username, now);
    },
  };
}
