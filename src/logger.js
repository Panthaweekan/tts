/**
 * Log levels ordered by severity.
 * @type {readonly string[]}
 */
const LEVELS = ['debug', 'info', 'warn', 'error'];

/**
 * ANSI color codes for each log level.
 */
const COLORS = {
  debug: '\x1b[90m', // gray
  info: '\x1b[36m', // cyan
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';

/**
 * Format a Date as YYYY-MM-DD HH:mm:ss (local time).
 * @param {Date} date
 * @returns {string}
 */
function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * Global minimum log level. Set once via setLogLevel().
 * @type {string}
 */
let globalLevel = 'info';

/**
 * Set the global minimum log level.
 * @param {string} level - One of: debug, info, warn, error
 */
export function setLogLevel(level) {
  const normalized = level.toLowerCase();
  if (!LEVELS.includes(normalized)) {
    throw new Error(`[logger] Invalid log level: "${level}". Must be one of: ${LEVELS.join(', ')}`);
  }
  globalLevel = normalized;
}

/**
 * Get the current global log level.
 * @returns {string}
 */
export function getLogLevel() {
  return globalLevel;
}

/**
 * Create a namespaced logger that respects the global log level.
 *
 * @param {string} namespace - Short label for the module (e.g. 'bot', 'tts', 'queue')
 * @returns {{ debug: Function, info: Function, warn: Function, error: Function }}
 *
 * @example
 * const log = createLogger('tts');
 * log.info('Streaming audio...');
 * // [2026-04-13 17:34:01] INFO  [tts] Streaming audio...
 */
export function createLogger(namespace) {
  const logger = {};

  for (const level of LEVELS) {
    logger[level] = (...args) => {
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

  return logger;
}
