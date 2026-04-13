import { describe, test, expect } from 'bun:test';
import { isValidMessage, isBlacklisted } from '../src/filters.js';

const DEFAULTS = { minLength: 3, maxLength: 120 };

describe('isValidMessage', () => {
  test('rejects messages shorter than minLength', () => {
    expect(isValidMessage('hi', 'chat', DEFAULTS)).toBe(false);
  });

  test('rejects messages longer than maxLength', () => {
    expect(isValidMessage('a'.repeat(121), 'chat', DEFAULTS)).toBe(false);
  });

  test('rejects emoji-only messages', () => {
    expect(isValidMessage('🎉🎉🎉', 'chat', DEFAULTS)).toBe(false);
  });

  test('rejects non-chat message types', () => {
    expect(isValidMessage('hello there', 'whisper', DEFAULTS)).toBe(false);
    expect(isValidMessage('hello there', 'action', DEFAULTS)).toBe(false);
  });

  test('accepts valid English text', () => {
    expect(isValidMessage('hello world', 'chat', DEFAULTS)).toBe(true);
  });

  test('accepts valid Thai text', () => {
    expect(isValidMessage('สวัสดีครับ', 'chat', DEFAULTS)).toBe(true);
  });

  test('accepts mixed Thai-English text', () => {
    expect(isValidMessage('hello สวัสดี', 'chat', DEFAULTS)).toBe(true);
  });

  test('rejects symbol-only messages', () => {
    expect(isValidMessage('!!! @@@', 'chat', DEFAULTS)).toBe(false);
  });
});

describe('isBlacklisted', () => {
  const blacklist = ['nightbot', 'streamelements'];

  test('returns true for blacklisted usernames (case-insensitive)', () => {
    expect(isBlacklisted('nightbot', blacklist)).toBe(true);
    expect(isBlacklisted('NIGHTBOT', blacklist)).toBe(true);
  });

  test('returns false for normal usernames', () => {
    expect(isBlacklisted('xanta', blacklist)).toBe(false);
  });
});
