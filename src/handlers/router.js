'use strict';

/**
 * Message router.
 * Receives every incoming message from the polling loop and dispatches it
 * to the correct handler. No business logic lives here.
 *
 * Routing priority:
 *   1. Contact share  → save phone, show menu
 *   2. Active session → continue multi-step conversation (or /cancel it)
 *   3. Command or keyboard button text → dispatch to handler
 *   4. Anything else  → show help hint
 */

const sessions = require('../sessions');
const { sendMessage } = require('../utils/bot');

const { handleStart, handleContact, handleHelp } = require('./start');
const { handleHourlyCommand, handleHourlyConversation } = require('./hourly');
const { handleDailyCommand, handleDailyConversation }   = require('./daily');
const { handleListCommand }    = require('./list');
const { handleSummaryCommand } = require('./summary');
const { handleCancel }         = require('./cancel');

// Text of keyboard buttons → command handler mapping
const BUTTON_MAP = {
  '🕐 مرخصی ساعتی':  handleHourlyCommand,
  '📅 مرخصی روزانه': handleDailyCommand,
  '📋 لیست مرخصی‌ها': handleListCommand,
  '📊 خلاصه':         handleSummaryCommand,
};

// Slash command → handler mapping
const COMMAND_MAP = {
  '/start':   handleStart,
  '/help':    handleHelp,
  '/hourly':  handleHourlyCommand,
  '/daily':   handleDailyCommand,
  '/list':    handleListCommand,
  '/summary': handleSummaryCommand,
  '/cancel':  handleCancel,
};

async function handleMessage(message) {
  // 1. Contact share
  if (message.contact) {
    return await handleContact(message);
  }

  // Only text messages from here on
  if (!message.text) return;

  const text   = message.text.trim();
  const userId = message.from.id;

  // 2. Active multi-step session
  if (sessions.has(userId)) {
    if (text === '/cancel') return await handleCancel(message);

    const session = sessions.get(userId);
    if (session.type === 'hourly') return await handleHourlyConversation(message, session);
    if (session.type === 'daily')  return await handleDailyConversation(message, session);
  }

  // 3a. Slash command
  if (text.startsWith('/')) {
    const cmd     = text.split(' ')[0].toLowerCase();
    const handler = COMMAND_MAP[cmd];
    if (handler) return await handler(message);
    return await sendMessage(message.chat.id, 'دستور نامعتبر است. /help را ارسال کنید.');
  }

  // 3b. Keyboard button text
  const buttonHandler = BUTTON_MAP[text];
  if (buttonHandler) return await buttonHandler(message);

  // 4. Unrecognised input
  await sendMessage(message.chat.id, 'برای مشاهده دستورات /help را ارسال کنید.');
}

module.exports = { handleMessage };
