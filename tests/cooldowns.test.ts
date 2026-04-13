import { describe, test, expect } from 'bun:test';
import { createCooldownManager } from '../src/cooldowns.ts';

describe('createCooldownManager', () => {
  test('allows first message immediately', () => {
    const cd = createCooldownManager({ globalMs: 2000, userMs: 8000 });
    expect(cd.canSpeak('alice')).toBe(true);
  });

  test('blocks on global cooldown', () => {
    const cd = createCooldownManager({ globalMs: 2000, userMs: 8000 });
    cd.record('alice');
    expect(cd.canSpeak('bob')).toBe(false);
  });

  test('blocks on per-user cooldown even after global expires', () => {
    const cd = createCooldownManager({ globalMs: 0, userMs: 8000 });
    cd.record('alice');
    expect(cd.canSpeak('alice')).toBe(false);
  });

  test('allows different user while first user is on per-user cooldown', () => {
    const cd = createCooldownManager({ globalMs: 0, userMs: 8000 });
    cd.record('alice');
    expect(cd.canSpeak('bob')).toBe(true);
  });

  test('allows user again after per-user cooldown expires', () => {
    const cd = createCooldownManager({ globalMs: 0, userMs: 0 });
    cd.record('alice');
    expect(cd.canSpeak('alice')).toBe(true);
  });

  test('record updates both global and user timestamps', () => {
    const cd = createCooldownManager({ globalMs: 100, userMs: 100 });
    cd.record('alice');
    expect(cd.canSpeak('alice')).toBe(false);
    expect(cd.canSpeak('bob')).toBe(false);
  });
});
