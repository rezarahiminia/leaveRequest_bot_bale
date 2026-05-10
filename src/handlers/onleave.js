'use strict';

/**
 * /onleave command
 * Shows everyone who is currently on leave right now.
 * – Daily  leave: today falls within [leave_date, leave_date + days)
 * – Hourly leave: today is the leave date AND current time is within [start_time, end_time]
 */

const db = require('../db');
const { sendMessage } = require('../utils/bot');

async function handleOnLeaveCommand(message) {
  const { chat } = message;

  const records = await db.getWhoIsOnLeave();

  if (records.length === 0) {
    await sendMessage(chat.id, '✅ در حال حاضر هیچ‌کس در مرخصی نیست.');
    return;
  }

  const lines = [`🔴 افراد در مرخصی (${records.length} نفر):\n`];

  records.forEach((r, i) => {
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
      || (r.username ? `@${r.username}` : '—');

    const shamsi = r.leave_date_shamsi || String(r.leave_date).split('T')[0];

    if (r.leave_type === 'daily') {
      lines.push(`${i + 1}. 📅 ${name}`);
      lines.push(`   از: ${shamsi}  |  ${r.days ?? 1} روز`);
    } else {
      lines.push(`${i + 1}. 🕐 ${name}`);
      lines.push(`   ${shamsi}  |  ${r.start_time} — ${r.end_time}`);
    }
  });

  await sendMessage(chat.id, lines.join('\n'));
}

module.exports = { handleOnLeaveCommand };
