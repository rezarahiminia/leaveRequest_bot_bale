const jalaali = require('jalaali-js');

const MONTHS_FA = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

// Get today in Shamsi
function todayJalali() {
  const now = new Date();
  return jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

// Build inline keyboard for a given jy/jm
function buildCalendarKeyboard(jy, jm) {
  const monthLen = jalaali.jalaaliMonthLength(jy, jm);

  // Header row: prev | Month Year | next
  const header = [
    { text: '◀', callback_data: `dp_nav_${jy}_${jm - 1 < 1 ? jy - 1 : jy}_${jm - 1 < 1 ? 12 : jm - 1}` },
    { text: `${MONTHS_FA[jm - 1]} ${jy}`, callback_data: 'dp_ignore' },
    { text: '▶', callback_data: `dp_nav_${jm + 1 > 12 ? jy + 1 : jy}_${jm + 1 > 12 ? 1 : jm + 1}` }
  ];

  // Day rows (5 days per row)
  const dayRows = [];
  let row = [];
  for (let d = 1; d <= monthLen; d++) {
    row.push({ text: String(d), callback_data: `dp_pick_${jy}_${jm}_${d}` });
    if (row.length === 5) {
      dayRows.push(row);
      row = [];
    }
  }
  if (row.length > 0) dayRows.push(row);

  return { inline_keyboard: [header, ...dayRows] };
}

// Convert Jalali to Gregorian string YYYY-MM-DD
function jalaliToGregorian(jy, jm, jd) {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

// Format Jalali date as readable string
function formatJalali(jy, jm, jd) {
  return `${jd} ${MONTHS_FA[jm - 1]} ${jy}`;
}

// Convert Gregorian date string (YYYY-MM-DD) to Jalali formatted string
function gregorianToJalaliStr(dateStr) {
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
  return formatJalali(jy, jm, jd);
}

module.exports = { todayJalali, buildCalendarKeyboard, jalaliToGregorian, formatJalali, gregorianToJalaliStr };
