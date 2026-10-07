/**
 * Structured logging.
 *
 * docs/ARCHITECTURE.md #37 defines the important event names. Logs are
 * single-line JSON so they can be shipped/parsed later. Secrets and original
 * audio are never logged.
 */
import { sanitizePayload } from '../../domain/shared/events.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

/**
 * @param {string} level
 * @param {string} event
 * @param {object} [fields]
 */
function emit(level, event, fields = {}) {
  if (LEVELS[level] < currentLevel) return;
  const record = {
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitizePayload(fields),
  };
  const line = JSON.stringify(record);
  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

export const logger = {
  debug: (event, fields) => emit('debug', event, fields),
  info: (event, fields) => emit('info', event, fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields),
};

export default logger;
