import { describe, test, expect, beforeEach, afterEach, spyOn } from 'bun:test';
import { createLogger, setLogLevel, getLogLevel } from '../src/logger.ts';

describe('setLogLevel', () => {
  afterEach(() => setLogLevel('info'));

  test('accepts valid log levels', () => {
    for (const level of ['debug', 'info', 'warn', 'error']) {
      setLogLevel(level);
      expect(getLogLevel()).toBe(level as any);
    }
  });

  test('is case-insensitive', () => {
    setLogLevel('DEBUG');
    expect(getLogLevel()).toBe('debug');
  });

  test('throws on invalid level', () => {
    expect(() => setLogLevel('verbose' as any)).toThrow('Invalid log level');
  });
});

describe('createLogger', () => {
  let logSpy: any;
  let warnSpy: any;
  let errorSpy: any;

  beforeEach(() => {
    logSpy = spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    setLogLevel('debug');
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    setLogLevel('info');
  });

  test('creates a logger with debug/info/warn/error methods', () => {
    const log = createLogger('test');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.info).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.error).toBe('function');
  });

  test('info writes to console.log', () => {
    const log = createLogger('mymod');
    log.info('hello world');
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('[mymod]');
    expect(output).toContain('INFO');
  });

  test('warn writes to console.warn', () => {
    const log = createLogger('mymod');
    log.warn('something odd');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const output = warnSpy.mock.calls[0][0];
    expect(output).toContain('WARN');
  });

  test('error writes to console.error', () => {
    const log = createLogger('mymod');
    log.error('boom');
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const output = errorSpy.mock.calls[0][0];
    expect(output).toContain('ERROR');
  });

  test('respects global log level — suppresses debug when level is info', () => {
    setLogLevel('info');
    const log = createLogger('mymod');
    log.debug('should be hidden');
    expect(logSpy).not.toHaveBeenCalled();
  });

  test('respects global log level — suppresses info when level is warn', () => {
    setLogLevel('warn');
    const log = createLogger('mymod');
    log.info('should be hidden');
    log.warn('should appear');
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  test('includes timestamp in output', () => {
    const log = createLogger('mymod');
    log.info('time check');
    const output = logSpy.mock.calls[0][0];
    // Timestamp format: [YYYY-MM-DD HH:mm:ss]
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]/);
  });
});
