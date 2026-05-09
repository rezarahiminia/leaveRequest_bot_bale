'use strict';

/**
 * /list command — shows the user's last 10 leave requests.
 */

const db        = require('../db');
const { sendMessage } = require('../utils/bot');
const { gregorianToJalaliStr } = require('../utils/date');
const { LEAVE } = require('../config');

const STATUS_EMOJI = { pending: '⏳', approved: '✅', rejected: '❌' };
const STATUS_LABEL = { pending: 'در انتظار', approved: 'تایید شده', rejected: 'رد شده' };

async function handleListCommand(message) {
  const { from, chat } = message;

  const leaves = await db.getUserLeaveRequests(from.id, LEAVE.LIST_LIMIT);

  if (leaves.length === 0) {
    await sendMessage(chat.id, 'شما هیچ مرخصی ثبت‌شده‌ای ندارید.');
    return;
  }

  const lines = ['لیست مرخصی‌های شما:\n'];

  leaves.forEach((leave, index) => {
    const shamsi = leave.leave_date_shamsi
      || gregorianToJalaliStr(leave.leave_date.toISOString().split('T')[0]);

    const typeLabel = leave.leave_type === 'hourly' ? 'ساعتی' : 'روزانه';
    const emoji     = STATUS_EMOJI[leave.status] ?? '❓';
    const statusLbl = STATUS_LABEL[leave.status] ?? leave.status;

    lines.push(`${index + 1}. ${typeLabel}  ${emoji} ${statusLbl}`);
    lines.push(`   📅 تاریخ: ${shamsi}`);

    if (leave.leave_type === 'hourly') {
      lines.push(`   🕐 ${leave.start_time} — ${leave.end_time}  (${leave.hours} ساعت)`);
    } else if (leave.days) {
      lines.push(`   📆 تعداد روز: ${leave.days}`);
    }

    lines.push(`   🆔 شناسه: ${leave.id}\n`);
  });

  await sendMessage(chat.id, lines.join('\n'));
}

module.exports = { handleListCommand };
