import { createLogger } from './logger.ts';

const log = createLogger('queue');

export interface QueueItem {
  text: string;
}

export interface QueueOptions {
  maxSize: number;
  processor: (item: QueueItem) => Promise<void>;
  onError?: (err: Error) => void;
}

export interface EnqueueOptions {
  priority?: boolean;
}

export interface QueueManager {
  enqueue(item: QueueItem, opts?: EnqueueOptions): void;
}

/**
 * Creates a priority queue that processes items sequentially using a provided processor.
 * @param options
 */
export function createQueue({ maxSize, processor, onError }: QueueOptions): QueueManager {
  const items: QueueItem[] = [];
  let isProcessing = false;

  async function processNext(): Promise<void> {
    if (isProcessing || items.length === 0) return;
    isProcessing = true;

    while (items.length > 0) {
      const item = items.shift();
      if (!item) {
        isProcessing = false;
        return;
      }

      try {
        await processor(item);
      } catch (err: Error | unknown) {
        const _err = err instanceof Error ? err : new Error(String(err));
        log.error('Processor error:', _err.message);
        if (onError) onError(_err);
      }
    }

    isProcessing = false;
  }

  return {
    enqueue(item: QueueItem, { priority = false }: EnqueueOptions = {}) {
      if (items.length >= maxSize) return;
      if (priority) items.unshift(item);
      else items.push(item);
      processNext();
    },
  };
}
