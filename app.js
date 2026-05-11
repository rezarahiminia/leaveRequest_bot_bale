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

const db       = require('./src/db');
const bot      = require('./src/utils/bot');
const logger   = require('./src/utils/logger');
const sessions = require('./src/sessions');
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

  // 3. Skip pending updates accumulated while bot was down
  //    (old pre_checkout_queries are already expired — no point answering them)
  await drainPendingUpdates();

  // 4. Long-polling loop
  poll();
}

// ─── Drain stale updates on startup ───────────────────────────────────────

async function drainPendingUpdates() {
  try {
    const pending = await bot.getUpdates(0, 0); // timeout=0 → return immediately
    if (pending.length === 0) return;

    offset = pending[pending.length - 1].update_id + 1;
    logger.info(`Skipped ${pending.length} stale update(s) from before restart (offset → ${offset})`);

    // Mark any leave requests that were awaiting payment as rejected
    for (const update of pending) {
      if (update.pre_checkout_query) {
        const payload = update.pre_checkout_query.invoice_payload || '';
        const leaveId = parseInt(payload.split(':')[1], 10);
        if (leaveId) {
          await db.updateLeaveStatus(leaveId, 'rejected').catch(() => {});
          logger.info(`Marked stale leave ${leaveId} as rejected (payment window expired)`);
        }
      }
    }
  } catch (err) {
    logger.warn('Could not drain pending updates on startup', { message: err.message });
  }
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

        // Must be answered within 10 seconds to approve/reject the pending payment.
        // We await this (unlike message handlers) to prioritize the response time.
        if (update.pre_checkout_query) {
          const pcq = update.pre_checkout_query;
          try {
            await bot.answerPreCheckoutQuery(pcq.id, true);
          } catch (err) {
            // "too old" means the 10s window passed — clean up gracefully
            logger.warn('answerPreCheckoutQuery expired or invalid', { error: err.message });

            const userId  = pcq.from?.id;
            const payload = pcq.invoice_payload || '';
            const leaveId = parseInt(payload.split(':')[1], 10);

            if (leaveId) {
              await db.updateLeaveStatus(leaveId, 'rejected').catch(() => {});
            }
            if (userId) {
              sessions.del(userId);
              bot.sendMessage(userId,
                '⚠️ مهلت پرداخت منقضی شد.\n' +
                'لطفاً دوباره اقدام به ثبت مرخصی کنید.'
              ).catch(() => {});
            }
          }
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
