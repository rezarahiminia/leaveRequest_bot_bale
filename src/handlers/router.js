'use strict';

/**
 * Message router.
 * Receives every incoming message from the polling loop and dispatches it
 * to the correct handler. No business logic lives here.
 *
 * Routing priority:
 *   1. Contact share        → save phone, show menu
 *   2. Successful payment   → confirm leave, send receipt
 *   3. Active session       → continue multi-step conversation (or /cancel it)
 *   4. Command or keyboard button text → dispatch to handler
 *   5. Anything else        → show help hint
 */

const sessions = require('../sessions');
const db        = require('../db');
const { sendMessage, notifyGroup } = require('../utils/bot');

const { handleStart, handleContact, handleHelp } = require('./start');
const { handleHourlyCommand, handleHourlyConversation } = require('./hourly');
const { handleDailyCommand, handleDailyConversation }   = require('./daily');
const { handleListCommand }    = require('./list');
const { handleSummaryCommand } = require('./summary');
const { handleCancel }         = require('./cancel');
const { handleOnLeaveCommand } = require('./onleave');

// Text of keyboard buttons → command handler mapping
const BUTTON_MAP = {
  '🕐 مرخصی ساعتی':  handleHourlyCommand,
  '📅 مرخصی روزانه': handleDailyCommand,
  '📋 لیست مرخصی‌ها': handleListCommand,
  '📊 خلاصه':         handleSummaryCommand,
  '🔴 افراد در مرخصی': handleOnLeaveCommand,
};

// Slash command → handler mapping
const COMMAND_MAP = {
  '/start':   handleStart,
  '/help':    handleHelp,
  '/hourly':  handleHourlyCommand,
  '/daily':   handleDailyCommand,
  '/list':    handleListCommand,
  '/summary': handleSummaryCommand,
  '/onleave': handleOnLeaveCommand,
  '/cancel':  handleCancel,
};

// ─── Successful payment handler ────────────────────────────────────────────

async function handleSuccessfulPayment(message) {
  const { from, chat, successful_payment } = message;

  // payload format: "hourly:<leaveId>" or "daily:<leaveId>"
  const payload  = successful_payment.invoice_payload || '';
  const parts    = payload.split(':');
  const leaveId  = parseInt(parts[1], 10);

  // Approve the leave in the database
  if (leaveId) {
    await db.updateLeaveStatus(leaveId, 'approved');
  }

  // Build payment receipt text
  const totalRials     = successful_payment.total_amount || 0;
  const amountToman    = Math.round(totalRials / 10).toLocaleString();
  const trackingId     = successful_payment.provider_payment_charge_id
                      || successful_payment.telegram_payment_charge_id
                      || '—';

  // Retrieve the leave receipt stored in session (if still available)
  const session         = sessions.get(from.id);
  const leaveReceipt    = session?.data?.receipt_text || `🆔 شناسه مرخصی: ${leaveId}`;
  sessions.del(from.id);

  const fullReceipt =
    leaveReceipt + '\n\n' +
    '💳 پرداخت موفق انجام شد!\n' +
    `💰 مبلغ پرداختی: ${amountToman} تومان\n` +
    `🔖 شماره پیگیری: ${trackingId}`;

  await sendMessage(chat.id, fullReceipt);
  await notifyGroup('💳 مرخصی پرداخت و تایید شد\n\n' + fullReceipt);
}

// ─── Main message router ───────────────────────────────────────────────────

async function handleMessage(message) {
  // Only respond to private chats — group messages are ignored.
  // (The bot still sends notifications TO groups, but never reads from them.)
  if (message.chat.type !== 'private') return;

  // 1. Contact share
  if (message.contact) {
    return await handleContact(message);
  }

  // 2. Successful payment (no text field — must be checked before the text guard)
  if (message.successful_payment) {
    return await handleSuccessfulPayment(message);
  }

  // Only text messages from here on
  if (!message.text) return;

  const text   = message.text.trim();
  const userId = message.from.id;

  // 3. Active multi-step session
  if (sessions.has(userId)) {
    if (text === '/cancel') return await handleCancel(message);

    const session = sessions.get(userId);

    // User is waiting for payment — don't process further input
    if (session.step === 'awaiting_payment') {
      await sendMessage(message.chat.id,
        '⏳ لطفاً پرداخت را از طریق فاکتور ارسال‌شده انجام دهید.\n\n' +
        'برای لغو: /cancel'
      );
      return;
    }

    if (session.type === 'hourly') return await handleHourlyConversation(message, session);
    if (session.type === 'daily')  return await handleDailyConversation(message, session);
  }

  // 4a. Slash command
  if (text.startsWith('/')) {
    const cmd     = text.split(' ')[0].toLowerCase();
    const handler = COMMAND_MAP[cmd];
    if (handler) return await handler(message);
    return await sendMessage(message.chat.id, 'دستور نامعتبر است. /help را ارسال کنید.');
  }

  // 4b. Keyboard button text
  const buttonHandler = BUTTON_MAP[text];
  if (buttonHandler) return await buttonHandler(message);

  // 5. Unrecognised input
  await sendMessage(message.chat.id, 'برای مشاهده دستورات /help را ارسال کنید.');
}

module.exports = { handleMessage };
