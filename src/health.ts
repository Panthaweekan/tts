export interface HealthStatus {
  connected: boolean;
  connectedAt: string | null;
  uptimeMinutes: number;
  messageCount: number;
  ttsSuccessCount: number;
  ttsErrorCount: number;
  retryCount: number;
}

export interface HealthTracker {
  markConnected(): void;
  recordMessage(): void;
  recordTtsSuccess(): void;
  recordTtsError(): void;
  recordRetry(): void;
  getStatus(): HealthStatus;
}

/**
 * Creates a health tracker that records bot lifecycle metrics.
 */
export function createHealthTracker(): HealthTracker {
  let connectedAt: Date | null = null;
  let messageCount = 0;
  let ttsSuccessCount = 0;
  let ttsErrorCount = 0;
  let retryCount = 0;

  return {
    markConnected(): void {
      connectedAt = new Date();
    },

    recordMessage(): void {
      messageCount++;
    },

    recordTtsSuccess(): void {
      ttsSuccessCount++;
    },

    recordTtsError(): void {
      ttsErrorCount++;
    },

    recordRetry(): void {
      retryCount++;
    },

    getStatus(): HealthStatus {
      const now = new Date();
      const uptimeMs = connectedAt ? now.getTime() - connectedAt.getTime() : 0;
      const uptimeMinutes = Math.floor(uptimeMs / 60000);

      return {
        connected: connectedAt !== null,
        connectedAt: connectedAt ? connectedAt.toISOString() : null,
        uptimeMinutes,
        messageCount,
        ttsSuccessCount,
        ttsErrorCount,
        retryCount,
      };
    },
  };
}
