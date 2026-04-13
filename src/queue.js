/**
 * Creates a priority queue that processes items sequentially using a provided processor.
 * @param {{ maxSize: number, processor: (item: object) => Promise<void> }} options
 * @returns {{ enqueue(item: object, opts: { priority: boolean }): void }}
 */
export function createQueue({ maxSize, processor }) {
  const items = [];
  let isProcessing = false;

  async function processNext() {
    if (isProcessing || items.length === 0) return;
    isProcessing = true;

    while (items.length > 0) {
      const item = items.shift();
      try {
        await processor(item);
      } catch (err) {
        console.error('[queue] Processor error:', err.message);
      }
    }

    isProcessing = false;
  }

  return {
    enqueue(item, { priority = false } = {}) {
      if (items.length >= maxSize) return;
      if (priority) items.unshift(item);
      else items.push(item);
      processNext();
    },
  };
}
