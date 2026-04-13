/**
 * Creates a health tracker that records bot lifecycle metrics.
 * @returns {{
 *   markConnected(): void,
 *   recordMessage(): void,
 *   recordTtsSuccess(): void,
 *   recordTtsError(): void,
 *   recordRetry(): void,
 *   getStatus(): object
 * }}
 */
export function createHealthTracker() {
  let connectedAt = null;
  let messageCount = 0;
  let ttsSuccessCount = 0;
  let ttsErrorCount = 0;
  let retryCount = 0;

  return {
    markConnected() {
      connectedAt = new Date();
    },

    recordMessage() {
      messageCount++;
    },

    recordTtsSuccess() {
      ttsSuccessCount++;
    },

    recordTtsError() {
      ttsErrorCount++;
    },

    recordRetry() {
      retryCount++;
    },

    getStatus() {
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
