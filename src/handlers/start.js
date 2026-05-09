'use strict';

/**
 * /start command handler.
 * – First visit: ask user to share their phone number.
 * – Returning user with phone saved: show main menu.
 */

const db = require('../db');
const { sendMessage, buildReplyKeyboard } = require('../utils/bot');
const { sendMainMenu } = require('./helpers');

const CONTACT_KEYBOARD = buildReplyKeyboard([
  [{ text: '📱 اشتراک‌گذاری شماره', request_contact: true }],
]);

async function handleStart(message) {
  const { from, chat } = message;

  await db.createOrUpdateUser(from.id, {
    username:   from.username,
    first_name: from.first_name,
    last_name:  from.last_name,
  });

  const user = await db.getUserById(from.id);
  const hasPhone = user?.phone;

  if (!hasPhone) {
    await sendMessage(
      chat.id,
      `سلام ${from.first_name || 'کاربر'} عزیز!\n\nبرای استفاده از ربات، لطفاً ابتدا شماره تلفن خود را به اشتراک بگذارید.`,
      CONTACT_KEYBOARD
    );
    return;
  }

  await sendMainMenu(chat.id, from.first_name);
}

/**
 * Handles an incoming contact (phone share).
 */
async function handleContact(message) {
  const { from, chat, contact } = message;

  await db.createOrUpdateUser(from.id, {
    username:   from.username,
    first_name: from.first_name,
    last_name:  from.last_name,
    phone:      contact.phone_number,
  });

  await sendMainMenu(chat.id, from.first_name);
}

async function handleHelp(message) {
  await sendMessage(
    message.chat.id,
    'راهنمای دستورات:\n\n' +
    '/start   — شروع / منوی اصلی\n' +
    '/hourly  — ثبت مرخصی ساعتی (امروز)\n' +
    '/daily   — ثبت مرخصی روزانه\n' +
    '/list    — آخرین ۱۰ مرخصی\n' +
    '/summary — آمار کلی مرخصی‌ها\n' +
    '/cancel  — لغو عملیات جاری'
  );
}

module.exports = { handleStart, handleContact, handleHelp };
