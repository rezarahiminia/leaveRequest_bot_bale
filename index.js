const axios = require('axios');
require('dotenv').config();
const db = require('./db');
const { gregorianToJalaliStr, jalaliToGregorian, formatJalali } = require('./datepicker');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = `https://tapi.bale.ai/bot${BOT_TOKEN}`;
const userSessions = new Map();

async function initBot() {
  console.log('\u{1F916} Starting Bale Leave Bot...');
  const dbConnected = await db.testConnection();
  if (!dbConnected) { process.exit(1); }
  try {
    const res = await axios.get(`${API_URL}/getMe`);
    if (res.data.ok) console.log('\u2705 Bot authenticated:', res.data.result.first_name);
    else { console.error('Bot auth failed'); process.exit(1); }
  } catch (e) { console.error('Error:', e.message); process.exit(1); }
  startPolling();
}

async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const payload = { chat_id: chatId, text };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    await axios.post(`${API_URL}/sendMessage`, payload);
  } catch (e) { console.error('sendMessage error:', e.message); }
}

async function editMessageReplyMarkup(chatId, messageId, replyMarkup) {
  try {
    await axios.post(`${API_URL}/editMessageReplyMarkup`, { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup });
  } catch (e) { /* ignore */ }
}

async function answerCallbackQuery(cbId) {
  try { await axios.post(`${API_URL}/answerCallbackQuery`, { callback_query_id: cbId }); } catch (e) { /* ignore */ }
}

function createKeyboard(buttons) {
  return { keyboard: buttons, resize_keyboard: true, one_time_keyboard: true };
}

async function ensureUser(user) {
  await db.createOrUpdateUser(user.id, { username: user.username, first_name: user.first_name, last_name: user.last_name });
}

async function sendMainMenu(chatId, firstName) {
  const text = 'سلام ' + (firstName || 'کاربر') + ' عزیز!\n\nبه ربات ثبت مرخصی خوش آمدید.\n\n/hourly - مرخصی ساعتی\n/daily - مرخصی روزانه\n/list - لیست مرخصی\u200cها\n/summary - خلاصه\n/help - راهنما';
  const keyboard = createKeyboard([
    [{ text: '\u{1F550} مرخصی ساعتی' }, { text: '\u{1F4C5} مرخصی روزانه' }],
    [{ text: '\u{1F4CB} لیست مرخصی\u200cها' }, { text: '\u{1F4CA} خلاصه' }]
  ]);
  await sendMessage(chatId, text, keyboard);
}

async function handleStart(message) {
  const user = message.from;
  await ensureUser(user);
  const existing = await db.getUserById(user.id);
  if (!existing || !existing.phone) {
    const keyboard = { keyboard: [[{ text: '\u{1F4F1} اشتراک\u200cگذاری شماره', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
    await sendMessage(message.chat.id, 'سلام ' + (user.first_name || 'کاربر') + ' عزیز!\n\nبرای استفاده از ربات، لطفاً ابتدا شماره تلفن خود را به اشتراک بگذارید.', keyboard);
    return;
  }
  await sendMainMenu(message.chat.id, user.first_name);
}

async function handleHelp(message) {
  await sendMessage(message.chat.id, 'راهنما:\n\n/hourly - مرخصی ساعتی (امروز)\n/daily - مرخصی روزانه با تقویم شمسی\n/list - لیست مرخصی\u200cها\n/summary - خلاصه و آمار\n/cancel - لغو عملیات');
}

async function handleHourlyCommand(message) {
  const userId = message.from.id;
  await ensureUser(message.from);
  const today = new Date().toISOString().split('T')[0];
  const todayShamsi = gregorianToJalaliStr(today);
  userSessions.set(userId, { type: 'hourly', step: 'start_time', data: { leave_date: today, leave_date_shamsi: todayShamsi } });
  await sendMessage(message.chat.id, 'ثبت مرخصی ساعتی (امروز: ' + todayShamsi + ')\n\nساعت شروع را وارد کنید:\nفرمت: HH:MM  مثال: 09:30\n\nیا /cancel برای لغو');
}

async function handleHourlyConversation(message, session) {
  const userId = message.from.id;
  const text = message.text;
  if (session.step === 'start_time') {
    if (!/^\d{2}:\d{2}$/.test(text)) { await sendMessage(message.chat.id, 'فرمت ساعت نامعتبر است.\nمثال: 09:30'); return; }
    session.data.start_time = text;
    session.step = 'duration';
    userSessions.set(userId, session);
    await sendMessage(message.chat.id, 'چند ساعت مرخصی?\n\nمثال: 2  یا  1.5');
  } else if (session.step === 'duration') {
    const hours = parseFloat(text);
    if (isNaN(hours) || hours <= 0 || hours > 24) { await sendMessage(message.chat.id, 'مقدار نامعتبر. عددی بین 0 تا 24 وارد کنید.'); return; }
    session.data.hours = hours.toFixed(2);
    const [sH, sM] = session.data.start_time.split(':').map(Number);
    const totalMins = sH * 60 + sM + Math.round(hours * 60);
    const eH = Math.floor(totalMins / 60) % 24;
    const eM = totalMins % 60;
    session.data.end_time = String(eH).padStart(2,'0') + ':' + String(eM).padStart(2,'0');
    try {
      const leaveId = await db.createLeaveRequest(userId, { leave_type: 'hourly', leave_date: session.data.leave_date, leave_date_shamsi: session.data.leave_date_shamsi, start_time: session.data.start_time, end_time: session.data.end_time, hours: session.data.hours });
      const displayName = ((message.from.first_name || '') + ' ' + (message.from.last_name || '')).trim() || ('@' + (message.from.username || String(userId)));
      await sendMessage(message.chat.id, 'مرخصی ساعتی ثبت شد!\n\n👤 نام: ' + displayName + '\n📅 تاریخ: ' + session.data.leave_date_shamsi + '\n🕐 از: ' + session.data.start_time + '\nتا: ' + session.data.end_time + '\nمدت: ' + session.data.hours + ' ساعت\nشناسه: ' + leaveId);
      userSessions.delete(userId);
    } catch (e) { console.error(e); await sendMessage(message.chat.id, 'خطا در ثبت مرخصی.'); userSessions.delete(userId); }
  }
}

async function handleDailyCommand(message) {
  const userId = message.from.id;
  await ensureUser(message.from);
  const today = new Date().toISOString().split('T')[0];
  const todayShamsi = gregorianToJalaliStr(today);
  userSessions.set(userId, { type: 'daily', step: 'start_date', data: { today_shamsi: todayShamsi } });
  await sendMessage(message.chat.id, 'ثبت مرخصی روزانه\n\nاز چه تاریخی مرخصی می\u200cخواهید?\n\nامروز: ' + todayShamsi + '\nفرمت: 1405/02/20\n\nیا /cancel برای لغو');
}

async function handleDailyConversation(message, session) {
  const userId = message.from.id;
  const text = message.text.trim();

  if (session.step === 'start_date') {
    const parts = text.split('/');
    const jy = parseInt(parts[0]), jm = parseInt(parts[1]), jd = parseInt(parts[2]);
    if (parts.length !== 3 || isNaN(jy) || isNaN(jm) || isNaN(jd) || jm < 1 || jm > 12 || jd < 1 || jd > 31) {
      await sendMessage(message.chat.id, 'تاریخ نامعتبر است.\nفرمت صحیح: 1405/02/20');
      return;
    }
    let leaveDate;
    try { leaveDate = jalaliToGregorian(jy, jm, jd); } catch (e) {
      await sendMessage(message.chat.id, 'تاریخ نامعتبر است.\nفرمت صحیح: 1405/02/20');
      return;
    }
    const leaveDateShamsi = formatJalali(jy, jm, jd);
    session.step = 'days';
    session.data.leave_date = leaveDate;
    session.data.leave_date_shamsi = leaveDateShamsi;
    userSessions.set(userId, session);
    await sendMessage(message.chat.id, 'از تاریخ: ' + leaveDateShamsi + '\n\nچند روز مرخصی نیاز دارید?\nمثال: 1  ');
    return;
  }

  if (session.step === 'days') {
    const days = parseFloat(text);
    if (isNaN(days) || days <= 0 || days > 30) {
      await sendMessage(message.chat.id, 'مقدار نامعتبر است. عددی بین 0 تا 30 وارد کنید.\n مثال: 1    ');
      return;
    }
    try {
      const leaveId = await db.createLeaveRequest(userId, {
        leave_type: 'daily',
        leave_date: session.data.leave_date,
        leave_date_shamsi: session.data.leave_date_shamsi,
        days: days
      });
      const displayName = ((message.from.first_name || '') + ' ' + (message.from.last_name || '')).trim() || ('@' + (message.from.username || String(userId)));
      await sendMessage(message.chat.id, 'مرخصی روزانه ثبت شد!\n\n👤 نام: ' + displayName + '\n📅 از تاریخ: ' + session.data.leave_date_shamsi + '\n📆 تعداد روز: ' + days + '\n\n🆔 شناسه: ' + leaveId);
      userSessions.delete(userId);
    } catch (e) {
      console.error(e);
      await sendMessage(message.chat.id, 'خطا در ثبت مرخصی.');
      userSessions.delete(userId);
    }
  }
}

async function handleCallbackQuery(callbackQuery) {
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  await answerCallbackQuery(callbackQuery.id);
  if (!data || !data.startsWith('dp_')) return;
  if (data === 'dp_ignore') return;
  if (data.startsWith('dp_nav_')) {
    const parts = data.split('_');
    const jy = parseInt(parts[2]);
    const jm = parseInt(parts[3]);
    await editMessageReplyMarkup(chatId, messageId, buildCalendarKeyboard(jy, jm));
    return;
  }
  if (data.startsWith('dp_pick_')) {
    const parts = data.split('_');
    const jy = parseInt(parts[2]);
    const jm = parseInt(parts[3]);
    const jd = parseInt(parts[4]);
    const session = userSessions.get(userId);
    if (!session || session.type !== 'daily') return;
    const gregorianDate = jalaliToGregorian(jy, jm, jd);
    const shamsiLabel = formatJalali(jy, jm, jd);
    await editMessageReplyMarkup(chatId, messageId, { inline_keyboard: [] });
    try {
      const leaveId = await db.createLeaveRequest(userId, { leave_type: 'daily', leave_date: gregorianDate, leave_date_shamsi: shamsiLabel });
      await sendMessage(chatId, 'مرخصی روزانه ثبت شد!\n\n📅 تاریخ: ' + shamsiLabel + '\nشناسه: ' + leaveId);
      userSessions.delete(userId);
    } catch (e) { console.error(e); await sendMessage(chatId, 'خطا در ثبت مرخصی.'); userSessions.delete(userId); }
  }
}

async function handleListCommand(message) {
  const userId = message.from.id;
  try {
    const leaves = await db.getUserLeaveRequests(userId, 10);
    if (leaves.length === 0) { await sendMessage(message.chat.id, 'شما هیچ مرخصی ثبت شده\u200cای ندارید.'); return; }
    let text = 'لیست مرخصی\u200cهای شما:\n\n';
    const statusEmoji = { pending: '⏳', approved: '✅', rejected: '❌' };
    leaves.forEach((leave, i) => {
      const typeEmoji = leave.leave_type === 'hourly' ? 'ساعتی' : 'روزانه';
      const shamsi = leave.leave_date_shamsi || gregorianToJalaliStr(leave.leave_date.toISOString().split('T')[0]);
      text += (i+1) + '. ' + typeEmoji + '\n';
      text += '  📅 تاریخ: ' + shamsi + '\n';
      if (leave.leave_type === 'hourly') text += '  🕐 ' + leave.start_time + ' - ' + leave.end_time + ' (' + leave.hours + 'h)\n';
      if (leave.leave_type === 'daily' && leave.days) text += '  📆 تعداد روز: ' + leave.days + '\n';
      text += '  ' + statusEmoji[leave.status] + ' ' + leave.status + '  |  ID: ' + leave.id + '\n\n';
    });
    await sendMessage(message.chat.id, text);
  } catch (e) { await sendMessage(message.chat.id, 'خطا در دریافت لیست.'); }
}

async function handleSummaryCommand(message) {
  const userId = message.from.id;
  try {
    const summary = await db.getUserLeaveSummary(userId);
    if (summary.length === 0) { await sendMessage(message.chat.id, 'شما هیچ مرخصی ثبت شده\u200cای ندارید.'); return; }
    let text = 'خلاصه مرخصی\u200cهای شما:\n\n';
    summary.forEach(item => {
      text += (item.leave_type === 'hourly' ? 'ساعتی' : 'روزانه') + ':\n';
      text += '  کل: ' + item.total + '  تایید: ' + item.approved + '  انتظار: ' + item.pending + '\n';
      if (item.leave_type === 'hourly' && item.total_hours > 0) text += '  مجموع: ' + item.total_hours + ' ساعت\n';
      text += '\n';
    });
    await sendMessage(message.chat.id, text);
  } catch (e) { await sendMessage(message.chat.id, 'خطا در دریافت خلاصه.'); }
}

async function handleCancel(message) {
  const userId = message.from.id;
  if (userSessions.has(userId)) { userSessions.delete(userId); await sendMessage(message.chat.id, 'عملیات لغو شد.'); }
  else await sendMessage(message.chat.id, 'هیچ عملیاتی در حال انجام نیست.');
}

async function handleMessage(message) {
  if (message.contact) {
    const user = message.from;
    await db.createOrUpdateUser(user.id, { username: user.username, first_name: user.first_name, last_name: user.last_name, phone: message.contact.phone_number });
    await sendMainMenu(message.chat.id, user.first_name);
    return;
  }
  if (!message.text) return;
  const userId = message.from.id;
  const text = message.text.trim();
  if (userSessions.has(userId)) {
    const session = userSessions.get(userId);
    if (text === '/cancel') { await handleCancel(message); return; }
    if (session.type === 'hourly') await handleHourlyConversation(message, session);
    else if (session.type === 'daily') await handleDailyConversation(message, session);
    return;
  }
  if (text.startsWith('/')) {
    const cmd = text.split(' ')[0].toLowerCase();
    switch (cmd) {
      case '/start':   await handleStart(message); break;
      case '/help':    await handleHelp(message); break;
      case '/hourly':  await handleHourlyCommand(message); break;
      case '/daily':   await handleDailyCommand(message); break;
      case '/list':    await handleListCommand(message); break;
      case '/summary': await handleSummaryCommand(message); break;
      case '/cancel':  await handleCancel(message); break;
      default: await sendMessage(message.chat.id, 'دستور نامعتبر. /help را ارسال کنید.');
    }
  } else {
    if (text === '\u{1F550} مرخصی ساعتی')       await handleHourlyCommand(message);
    else if (text === '\u{1F4C5} مرخصی روزانه')  await handleDailyCommand(message);
    else if (text === '\u{1F4CB} لیست مرخصی\u200cها') await handleListCommand(message);
    else if (text === '\u{1F4CA} خلاصه')         await handleSummaryCommand(message);
    else await sendMessage(message.chat.id, 'برای مشاهده دستورات /help را ارسال کنید.');
  }
}

let offset = 0;
async function startPolling() {
  console.log('Polling started...');
  while (true) {
    try {
      const res = await axios.get(`${API_URL}/getUpdates`, { params: { offset, timeout: 30 } });
      if (res.data.ok && res.data.result.length > 0) {
        for (const update of res.data.result) {
          offset = update.update_id + 1;
          if (update.message)        await handleMessage(update.message);
          if (update.callback_query) await handleCallbackQuery(update.callback_query);
        }
      }
    } catch (e) { console.error('Polling error:', e.message); await new Promise(r => setTimeout(r, 3000)); }
  }
}

initBot();
process.on('SIGINT', async () => { await db.pool.end(); process.exit(0); });
