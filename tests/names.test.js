import { describe, test, expect } from 'bun:test';
import { createNameManager } from '../src/names.js';

/** Build a minimal tmi.js tags object */
function tags(displayName, username) {
  return { 'display-name': displayName, username: username || displayName.toLowerCase() };
}

describe('createNameManager - name cleaning', () => {
  test('strips digits from display name', () => {
    const nm = createNameManager({ maxLen: 6, sessionMs: 30000 });
    const result = nm.format(tags('Xanta123'), 'hello');
    expect(result).toBe('Xanta: hello');
  });

  test('truncates long display names to maxLen', () => {
    const nm = createNameManager({ maxLen: 6, sessionMs: 30000 });
    const result = nm.format(tags('Panthaweekan'), 'hi there');
    expect(result.startsWith('Panth')).toBe(true);
  });

  test('falls back to username if display name is all digits', () => {
    const nm = createNameManager({ maxLen: 6, sessionMs: 30000 });
    const result = nm.format({ 'display-name': '12345', username: 'xanta' }, 'hi');
    expect(result).toBe('xanta: hi');
  });
});

describe('createNameManager - session caching', () => {
  test('skips name prefix on repeat message within session window', () => {
    const nm = createNameManager({ maxLen: 6, sessionMs: 30000 });
    nm.format(tags('Alice'), 'first message');
    const second = nm.format(tags('Alice'), 'second message');
    expect(second).toBe('second message');
  });

  test('includes name prefix after session window expires', () => {
    const nm = createNameManager({ maxLen: 6, sessionMs: 0 });
    nm.format(tags('Alice'), 'first');
    const second = nm.format(tags('Alice'), 'second');
    expect(second).toContain('Alice');
  });

  test('includes name prefix when speaker changes', () => {
    const nm = createNameManager({ maxLen: 6, sessionMs: 30000 });
    nm.format(tags('Alice'), 'first');
    const second = nm.format(tags('Bob99'), 'hello');
    expect(second).toContain('Bob');
  });
});
