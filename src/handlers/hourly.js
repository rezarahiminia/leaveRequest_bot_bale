'use strict';

/**
 * Hourly leave flow
 * ─────────────────
 * Step 1 (start_time): ask for start time in HH:MM format
 * Step 2 (duration):   ask for duration in hours (decimal allowed)
 *
 * The date is always today (auto-set at flow start).
 */

const db        = require('../db');
const sessions  = require('../sessions');
const { sendMessage } = require('../utils/bot');
const { todayGregorianStr, todayJalaliStr } = require('../utils/date');
const { getDisplayName } = require('./helpers');
const { LEAVE } = require('../config');

// ─── Flow start ────────────────────────────────────────────────────────────

async function handleHourlyCommand(message) {
  const { from, chat } = message;

  await db.createOrUpdateUser(from.id, {
    username: from.username, first_name: from.first_name, last_name: from.last_name,
  });

  const leaveDate       = todayGregorianStr();
  const leaveDateShamsi = todayJalaliStr();

  sessions.set(from.id, {
    type: 'hourly',
    step: 'start_time',
    data: { leave_date: leaveDate, leave_date_shamsi: leaveDateShamsi },
  });

  await sendMessage(
    chat.id,
    `ثبت مرخصی ساعتی (امروز: ${leaveDateShamsi})\n\n` +
    'ساعت شروع را وارد کنید:\n' +
    'فرمت: HH:MM  —  مثال: 09:30\n\n' +
    'یا /cancel برای لغو'
  );
}

// ─── Conversation steps ────────────────────────────────────────────────────

async function handleHourlyConversation(message, session) {
  const { from, chat } = message;
  const text = message.text.trim();

  if (session.step === 'start_time') {
    return await _stepStartTime(from, chat, text, session);
  }
  if (session.step === 'duration') {
    return await _stepDuration(from, chat, text, session);
  }
}

async function _stepStartTime(from, chat, text, session) {
  if (!/^\d{2}:\d{2}$/.test(text)) {
    await sendMessage(chat.id, 'فرمت ساعت نامعتبر است.\nمثال: 09:30');
    return;
  }

  session.data.start_time = text;
  session.step = 'duration';
  sessions.set(from.id, session);

  await sendMessage(
    chat.id,
    'چند ساعت مرخصی نیاز دارید?\n\nمثال: 2  یا  1.5 (یک و نیم ساعت)'
  );
}

async function _stepDuration(from, chat, text, session) {
  const hours = parseFloat(text);
  if (isNaN(hours) || hours <= 0 || hours > LEAVE.MAX_HOURLY_HOURS) {
    await sendMessage(chat.id, `مقدار نامعتبر. عددی بین 0 تا ${LEAVE.MAX_HOURLY_HOURS} وارد کنید.`);
    return;
  }

  const { start_time, leave_date, leave_date_shamsi } = session.data;

  // Calculate end time
  const [startH, startM] = start_time.split(':').map(Number);
  const totalMins = startH * 60 + startM + Math.round(hours * 60);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  const end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

  const leaveId = await db.createLeaveRequest(from.id, {
    leave_type:        'hourly',
    leave_date,
    leave_date_shamsi,
    start_time,
    end_time,
    hours:             hours.toFixed(2),
  });

  sessions.del(from.id);

  const name = getDisplayName(from);
  await sendMessage(
    chat.id,
    '✅ مرخصی ساعتی ثبت شد!\n\n' +
    `👤 نام: ${name}\n` +
    `📅 تاریخ: ${leave_date_shamsi}\n` +
    `🕐 از: ${start_time}  تا: ${end_time}\n` +
    `⏱ مدت: ${hours} ساعت\n\n` +
    `🆔 شناسه: ${leaveId}`
  );
}

module.exports = { handleHourlyCommand, handleHourlyConversation };
