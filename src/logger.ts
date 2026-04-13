export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log levels ordered by severity.
 */
const LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * ANSI color codes for each log level.
 */
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

/**
 * Format a Date as YYYY-MM-DD HH:mm:ss (local time).
 * @param date
 */
function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Global minimum log level. Set once via setLogLevel().
 */
let globalLevel: LogLevel = 'info';

/**
 * Set the global minimum log level.
 * @param level - One of: debug, info, warn, error
 */
export function setLogLevel(level: string): void {
  const normalized = level.toLowerCase() as LogLevel;
  if (!LEVELS.includes(normalized)) {
    throw new Error(`[logger] Invalid log level: "${level}". Must be one of: ${LEVELS.join(', ')}`);
  }
  globalLevel = normalized;
}

/**
 * Get the current global log level.
 */
export function getLogLevel(): LogLevel {
  return globalLevel;
}

export type LoggerMethod = (...args: unknown[]) => void;

export interface Logger {
  debug: LoggerMethod;
  info: LoggerMethod;
  warn: LoggerMethod;
  error: LoggerMethod;
}

/**
 * Create a namespaced logger that respects the global log level.
 *
 * @param namespace - Short label for the module (e.g. 'bot', 'tts', 'queue')
 *
 * @example
 * const log = createLogger('tts');
 * log.info('Streaming audio...');
 * // [2026-04-13 17:34:01] INFO  [tts] Streaming audio...
 */
export function createLogger(namespace: string): Logger {
  const logger: Partial<Logger> = {};

  for (const level of LEVELS) {
    logger[level] = (...args: unknown[]) => {
      if (LEVELS.indexOf(level) < LEVELS.indexOf(globalLevel)) return;

      const timestamp = formatTimestamp(new Date());
      const tag = level.toUpperCase().padEnd(5);
      const prefix = `${COLORS[level]}[${timestamp}] ${tag} [${namespace}]${RESET}`;

      if (level === 'error') {
        console.error(prefix, ...args);
      } else if (level === 'warn') {
        console.warn(prefix, ...args);
      } else {
        console.log(prefix, ...args);
      }
    };
  }

  return logger as Logger;
}
