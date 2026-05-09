'use strict';

/**
 * Daily leave flow
 * ────────────────
 * Step 1 (start_date): ask for the start date in Jalali "YYYY/MM/DD" format
 * Step 2 (days):       ask for number of days (decimal allowed, e.g. 0.5 = half day)
 */

const db        = require('../db');
const sessions  = require('../sessions');
const { sendMessage } = require('../utils/bot');
const { todayJalaliStr, parseJalaliInput, jalaliToGregorian, formatJalali } = require('../utils/date');
const { getDisplayName } = require('./helpers');
const { LEAVE } = require('../config');

// ─── Flow start ────────────────────────────────────────────────────────────

async function handleDailyCommand(message) {
  const { from, chat } = message;

  await db.createOrUpdateUser(from.id, {
    username: from.username, first_name: from.first_name, last_name: from.last_name,
  });

  sessions.set(from.id, {
    type: 'daily',
    step: 'start_date',
    data: {},
  });

  const todayShamsi = todayJalaliStr();

  await sendMessage(
    chat.id,
    'ثبت مرخصی روزانه\n\n' +
    'از چه تاریخی مرخصی می‌خواهید؟\n\n' +
    `امروز: ${todayShamsi}\n` +
    'فرمت ورودی: 1405/02/20\n\n' +
    'یا /cancel برای لغو'
  );
}

// ─── Conversation steps ────────────────────────────────────────────────────

async function handleDailyConversation(message, session) {
  const { from, chat } = message;
  const text = message.text.trim();

  if (session.step === 'start_date') {
    return await _stepStartDate(from, chat, text, session);
  }
  if (session.step === 'days') {
    return await _stepDays(from, chat, text, session);
  }
}

async function _stepStartDate(from, chat, text, session) {
  let parsed;
  try {
    parsed = parseJalaliInput(text);
  } catch {
    await sendMessage(chat.id, 'تاریخ نامعتبر است.\nفرمت صحیح: 1405/02/20');
    return;
  }

  const { jy, jm, jd } = parsed;
  let leaveDate;
  try {
    leaveDate = jalaliToGregorian(jy, jm, jd);
  } catch {
    await sendMessage(chat.id, 'تاریخ وارد‌شده در تقویم وجود ندارد.\nلطفاً تاریخ معتبر وارد کنید.');
    return;
  }

  const leaveDateShamsi = formatJalali(jy, jm, jd);

  session.step         = 'days';
  session.data.leave_date        = leaveDate;
  session.data.leave_date_shamsi = leaveDateShamsi;
  sessions.set(from.id, session);

  await sendMessage(
    chat.id,
    `از تاریخ: ${leaveDateShamsi}\n\n` +
    'چند روز مرخصی نیاز دارید?\n' +
    'مثال: 1  یا  0.5 (نیم روز)'
  );
}

async function _stepDays(from, chat, text, session) {
  const days = parseFloat(text);
  if (isNaN(days) || days <= 0 || days > LEAVE.MAX_DAILY_DAYS) {
    await sendMessage(
      chat.id,
      `مقدار نامعتبر. عددی بین 0 تا ${LEAVE.MAX_DAILY_DAYS} وارد کنید.\nمثال: 1  یا  0.5`
    );
    return;
  }

  const { leave_date, leave_date_shamsi } = session.data;

  const leaveId = await db.createLeaveRequest(from.id, {
    leave_type: 'daily',
    leave_date,
    leave_date_shamsi,
    days,
  });

  sessions.del(from.id);

  const name = getDisplayName(from);
  await sendMessage(
    chat.id,
    '✅ مرخصی روزانه ثبت شد!\n\n' +
    `👤 نام: ${name}\n` +
    `📅 از تاریخ: ${leave_date_shamsi}\n` +
    `📆 تعداد روز: ${days}\n\n` +
    `🆔 شناسه: ${leaveId}`
  );
}

module.exports = { handleDailyCommand, handleDailyConversation };
