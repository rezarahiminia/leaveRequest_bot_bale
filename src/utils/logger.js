'use strict';

/**
 * Simple leveled logger.
 * All output goes to stdout/stderr with a timestamp and level prefix.
 * Replace this module with winston/pino in production if needed.
 */

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LEVELS.INFO;

function timestamp() {
  return new Date().toISOString();
}

function log(level, message, meta) {
  if (LEVELS[level] < CURRENT_LEVEL) return;

  const base = `[${timestamp()}] [${level}] ${message}`;
  const output = meta ? `${base} ${JSON.stringify(meta)}` : base;

  if (level === 'ERROR' || level === 'WARN') {
    console.error(output);
  } else {
    console.log(output);
  }
}

const logger = {
  debug: (msg, meta) => log('DEBUG', msg, meta),
  info:  (msg, meta) => log('INFO',  msg, meta),
  warn:  (msg, meta) => log('WARN',  msg, meta),
  error: (msg, meta) => log('ERROR', msg, meta),
};

module.exports = logger;
