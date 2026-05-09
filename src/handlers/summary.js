'use strict';

/**
 * /summary command — shows aggregated leave statistics.
 */

const db = require('../db');
const { sendMessage } = require('../utils/bot');

async function handleSummaryCommand(message) {
  const { from, chat } = message;

  const summary = await db.getUserLeaveSummary(from.id);

  if (summary.length === 0) {
    await sendMessage(chat.id, 'شما هیچ مرخصی ثبت‌شده‌ای ندارید.');
    return;
  }

  const lines = ['📊 خلاصه مرخصی‌های شما:\n'];

  for (const row of summary) {
    const typeLabel = row.leave_type === 'hourly' ? '🕐 ساعتی' : '📅 روزانه';
    lines.push(typeLabel);
    lines.push(`   کل: ${row.total}  |  تایید: ${row.approved}  |  در انتظار: ${row.pending}`);
    if (row.leave_type === 'hourly' && row.total_hours > 0) {
      lines.push(`   مجموع ساعات: ${Number(row.total_hours).toFixed(1)} ساعت`);
    }
    lines.push('');
  }

  await sendMessage(chat.id, lines.join('\n'));
}

module.exports = { handleSummaryCommand };
