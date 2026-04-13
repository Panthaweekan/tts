import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  const REQUIRED = {
    BOT_USERNAME: 'testbot',
    OAUTH_TOKEN: 'oauth:testtoken123',
    CHANNEL: 'testchannel',
  };

  beforeEach(() => {
    Object.assign(process.env, REQUIRED);
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED)) delete process.env[key];
    delete process.env.TTS_VOICE;
    delete process.env.TTS_VOLUME;
    delete process.env.NAME_MAX_LENGTH;
    delete process.env.SESSION_WINDOW_MS;
    delete process.env.COOLDOWN_GLOBAL_MS;
    delete process.env.COOLDOWN_USER_MS;
  });

  test('throws when BOT_USERNAME is missing', () => {
    delete process.env.BOT_USERNAME;
    expect(() => loadConfig()).toThrow('BOT_USERNAME');
  });

  test('throws when OAUTH_TOKEN is missing', () => {
    delete process.env.OAUTH_TOKEN;
    expect(() => loadConfig()).toThrow('OAUTH_TOKEN');
  });

  test('throws when CHANNEL is missing', () => {
    delete process.env.CHANNEL;
    expect(() => loadConfig()).toThrow('CHANNEL');
  });

  test('applies default TTS_VOICE when not set', () => {
    const config = loadConfig();
    expect(config.ttsVoice).toBe('th-TH-PremwadeeNeural');
  });

  test('applies default TTS_VOLUME when not set', () => {
    const config = loadConfig();
    expect(config.ttsVolume).toBe('-95%');
  });

  test('applies default cooldowns when not set', () => {
    const config = loadConfig();
    expect(config.globalCooldownMs).toBe(2000);
    expect(config.userCooldownMs).toBe(8000);
  });

  test('returns a frozen object', () => {
    const config = loadConfig();
    expect(() => {
      config.channel = 'hacked';
    }).toThrow();
  });

  test('reads custom values from env', () => {
    process.env.TTS_VOICE = 'en-US-EmmaMultilingualNeural';
    process.env.NAME_MAX_LENGTH = '10';
    const config = loadConfig();
    expect(config.ttsVoice).toBe('en-US-EmmaMultilingualNeural');
    expect(config.nameMaxLength).toBe(10);
  });
});
