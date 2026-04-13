export interface CooldownOptions {
  globalMs: number;
  userMs: number;
}

export interface CooldownManager {
  canSpeak(username: string): boolean;
  record(username: string): void;
}

/**
 * Creates a cooldown manager that enforces a global and per-user cooldown.
 * @param options
 */
export function createCooldownManager({ globalMs, userMs }: CooldownOptions): CooldownManager {
  let lastGlobal = 0;
  const userTimestamps = new Map<string, number>();

  return {
    canSpeak(username: string): boolean {
      const now = Date.now();
      if (now - lastGlobal < globalMs) return false;
      const lastUser = userTimestamps.get(username) || 0;
      if (now - lastUser < userMs) return false;
      return true;
    },

    record(username: string): void {
      const now = Date.now();
      lastGlobal = now;
      userTimestamps.set(username, now);
    },
  };
}
