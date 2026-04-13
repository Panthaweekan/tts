import { describe, test, expect } from 'bun:test';
import { createQueue } from '../src/queue.js';

describe('createQueue', () => {
  test('processes items in FIFO order', async () => {
    const processed = [];
    const q = createQueue({
      maxSize: 10,
      processor: async (item) => {
        processed.push(item.text);
      },
    });
    q.enqueue({ text: 'first' }, { priority: false });
    q.enqueue({ text: 'second' }, { priority: false });
    await new Promise((r) => setTimeout(r, 50));
    expect(processed).toEqual(['first', 'second']);
  });

  test('priority items jump to the front of the pending queue', async () => {
    const processed = [];
    let unblock;
    const blocker = new Promise((r) => {
      unblock = r;
    });

    const q = createQueue({
      maxSize: 10,
      processor: async (item) => {
        if (item.text === 'first') await blocker;
        processed.push(item.text);
      },
    });

    q.enqueue({ text: 'first' }, { priority: false });
    q.enqueue({ text: 'regular' }, { priority: false });
    q.enqueue({ text: 'subscriber' }, { priority: true });

    unblock();
    await new Promise((r) => setTimeout(r, 50));
    expect(processed[1]).toBe('subscriber');
  });

  test('silently drops items when max size is reached', async () => {
    const processed = [];
    let unblock;
    const blocker = new Promise((r) => {
      unblock = r;
    });

    // maxSize: 1 means only 1 item can be pending. The first item is already
    // being processed (shifted out), so 'second' fills the pending slot and
    // 'dropped' exceeds maxSize and gets silently discarded.
    const q = createQueue({
      maxSize: 1,
      processor: async (item) => {
        if (item.text === 'first') await blocker;
        processed.push(item.text);
      },
    });

    q.enqueue({ text: 'first' }, { priority: false });
    q.enqueue({ text: 'second' }, { priority: false });
    q.enqueue({ text: 'dropped' }, { priority: false });

    unblock();
    await new Promise((r) => setTimeout(r, 50));
    expect(processed).not.toContain('dropped');
  });

  test('processes items sequentially — never concurrent', async () => {
    const active = [];
    let maxConcurrent = 0;

    const q = createQueue({
      maxSize: 10,
      processor: async (item) => {
        active.push(item.text);
        maxConcurrent = Math.max(maxConcurrent, active.length);
        await new Promise((r) => setTimeout(r, 10));
        active.splice(active.indexOf(item.text), 1);
      },
    });

    q.enqueue({ text: 'a' }, { priority: false });
    q.enqueue({ text: 'b' }, { priority: false });
    q.enqueue({ text: 'c' }, { priority: false });

    await new Promise((r) => setTimeout(r, 100));
    expect(maxConcurrent).toBe(1);
  });
});
