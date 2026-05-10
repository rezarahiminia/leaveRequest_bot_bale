'use strict';

/**
 * Shared helpers used across multiple handlers.
 */

const { sendMessage, buildReplyKeyboard } = require('../utils/bot');

const MAIN_MENU_KEYBOARD = buildReplyKeyboard([
  [{ text: '🕐 مرخصی ساعتی' }, { text: '📅 مرخصی روزانه' }],
  [{ text: '📋 لیست مرخصی‌ها' }, { text: '📊 خلاصه' }],
  [{ text: '🔴 افراد در مرخصی' }],
]);

async function sendMainMenu(chatId, firstName) {
  const greeting = `سلام ${firstName || 'کاربر'} عزیز!\n\n` +
    'به ربات ثبت مرخصی خوش آمدید.\n\n' +
    '/hourly   — مرخصی ساعتی\n' +
    '/daily    — مرخصی روزانه\n' +
    '/list     — لیست مرخصی‌ها\n' +
    '/summary  — خلاصه آمار\n' +
    '/onleave  — افراد در مرخصی الان\n' +
    '/help     — راهنما';

  await sendMessage(chatId, greeting, MAIN_MENU_KEYBOARD);
}

/**
 * Build the display name for a user.
 * Priority: full name → @username → numeric id
 */
function getDisplayName(from) {
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (from.username) return `@${from.username}`;
  return String(from.id);
}

module.exports = { sendMainMenu, getDisplayName };
