'use strict';

/**
 * Daily leave flow
 * ────────────────
 * Step 1 (start_date): ask for the start date in Jalali "YYYY/MM/DD" format
 * Step 2 (days):       ask for number of days (decimal allowed, e.g. 0.5 = half day)
 */

const db        = require('../db');
const sessions  = require('../sessions');
const { sendMessage, notifyGroup, sendInvoice } = require('../utils/bot');
const { todayJalaliStr, parseJalaliInput, jalaliToGregorian, formatJalali, toEnDigits } = require('../utils/date');
const { getDisplayName } = require('./helpers');
const { LEAVE, WALLET } = require('../config');

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
  const days = parseFloat(toEnDigits(text));
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

  const name = getDisplayName(from);
  const receiptText =
    '✅ مرخصی روزانه ثبت شد!\n\n' +
    `👤 نام: ${name}\n` +
    `📅 از تاریخ: ${leave_date_shamsi}\n` +
    `📆 تعداد روز: ${days}\n\n` +
    `🆔 شناسه: ${leaveId}`;

  if (WALLET.ENABLED) {
    // Keep session alive waiting for payment confirmation
    session.step = 'awaiting_payment';
    session.data.leaveId      = leaveId;
    session.data.receipt_text = receiptText;
    sessions.set(from.id, session);

    const totalPrice  = Math.round(WALLET.DAILY_PRICE * days);
    const amountToman = Math.round(totalPrice / 10).toLocaleString();
    await sendInvoice(
      chat.id,
      'پرداخت مرخصی روزانه',
      `مرخصی روزانه — ${leave_date_shamsi} — ${days} روز`,
      `daily:${leaveId}`,
      [{ label: `کارمزد مرخصی روزانه ${days} روز (${amountToman} تومان)`, amount: totalPrice }]
    );
  } else {
    await db.updateLeaveStatus(leaveId, 'approved');
    sessions.del(from.id);
    await sendMessage(chat.id, receiptText);
    await notifyGroup('🔔 مرخصی جدید ثبت شد\n\n' + receiptText);
  }
}

module.exports = { handleDailyCommand, handleDailyConversation };
