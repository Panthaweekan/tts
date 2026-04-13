import { describe, test, expect } from 'bun:test';
import { createHealthTracker } from '../src/health.js';

describe('createHealthTracker', () => {
  test('starts with zero counts and not connected', () => {
    const health = createHealthTracker();
    const status = health.getStatus();
    expect(status.connected).toBe(false);
    expect(status.connectedAt).toBeNull();
    expect(status.messageCount).toBe(0);
    expect(status.ttsSuccessCount).toBe(0);
    expect(status.ttsErrorCount).toBe(0);
    expect(status.retryCount).toBe(0);
  });

  test('markConnected sets connected state', () => {
    const health = createHealthTracker();
    health.markConnected();
    const status = health.getStatus();
    expect(status.connected).toBe(true);
    expect(status.connectedAt).not.toBeNull();
    expect(status.uptimeMinutes).toBeGreaterThanOrEqual(0);
  });

  test('recordMessage increments message count', () => {
    const health = createHealthTracker();
    health.recordMessage();
    health.recordMessage();
    health.recordMessage();
    expect(health.getStatus().messageCount).toBe(3);
  });

  test('recordTtsSuccess increments TTS success count', () => {
    const health = createHealthTracker();
    health.recordTtsSuccess();
    health.recordTtsSuccess();
    expect(health.getStatus().ttsSuccessCount).toBe(2);
  });

  test('recordTtsError increments TTS error count', () => {
    const health = createHealthTracker();
    health.recordTtsError();
    expect(health.getStatus().ttsErrorCount).toBe(1);
  });

  test('recordRetry increments retry count', () => {
    const health = createHealthTracker();
    health.recordRetry();
    health.recordRetry();
    health.recordRetry();
    expect(health.getStatus().retryCount).toBe(3);
  });

  test('getStatus returns a snapshot object', () => {
    const health = createHealthTracker();
    health.markConnected();
    health.recordMessage();
    health.recordTtsSuccess();
    const status = health.getStatus();
    expect(status).toEqual({
      connected: true,
      connectedAt: expect.any(String),
      uptimeMinutes: expect.any(Number),
      messageCount: 1,
      ttsSuccessCount: 1,
      ttsErrorCount: 0,
      retryCount: 0,
    });
  });
});
