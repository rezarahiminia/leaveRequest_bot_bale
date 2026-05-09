'use strict';

/**
 * Entry point.
 *
 * Responsibilities:
 *   1. Verify DB connectivity and bot authentication on startup.
 *   2. Run the long-polling loop and hand each update to the router.
 *   3. Shut down cleanly on SIGINT (Ctrl-C).
 *
 * Nothing else lives here — all logic is in src/.
 */

const db      = require('./src/db');
const bot     = require('./src/utils/bot');
const logger  = require('./src/utils/logger');
const { handleMessage } = require('./src/handlers/router');
const { POLLING_TIMEOUT, POLLING_RETRY_DELAY } = require('./src/config');

// ─── Startup ───────────────────────────────────────────────────────────────

async function start() {
  logger.info('Starting Bale Leave Bot…');

  // 1. Database
  const dbOk = await db.testConnection();
  if (!dbOk) {
    logger.error('Cannot connect to database. Exiting.');
    process.exit(1);
  }

  // 2. Bot authentication
  const me = await bot.getMe();
  logger.info(`Bot authenticated: @${me.username} (id=${me.id})`);

  // 3. Long-polling loop
  poll();
}

// ─── Polling loop ──────────────────────────────────────────────────────────

let offset = 0;

async function poll() {
  logger.info('Polling started.');

  while (true) {
    try {
      const updates = await bot.getUpdates(offset, POLLING_TIMEOUT);

      for (const update of updates) {
        offset = update.update_id + 1;

        if (update.message) {
          // Errors in a single handler must not crash the loop
          handleMessage(update.message).catch((err) =>
            logger.error('Unhandled error in handleMessage', { error: err.message })
          );
        }
      }
    } catch (err) {
      logger.warn('Polling error, retrying…', { message: err.message });
      await sleep(POLLING_RETRY_DELAY);
    }
  }
}

// ─── Graceful shutdown ─────────────────────────────────────────────────────

process.on('SIGINT', async () => {
  logger.info('Shutting down…');
  await db.pool.end();
  process.exit(0);
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Run ───────────────────────────────────────────────────────────────────

start().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});
