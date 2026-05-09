'use strict';

/**
 * Persian (Jalali/Shamsi) calendar utilities.
 * Wraps the jalaali-js library so the rest of the code
 * works with plain strings and never imports jalaali-js directly.
 */

const jalaali = require('jalaali-js');

const MONTH_NAMES_FA = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر',     'مرداد',    'شهریور',
  'مهر',     'آبان',     'آذر',
  'دی',      'بهمن',     'اسفند',
];

// ─── Conversion helpers ────────────────────────────────────────────────────

/**
 * Convert a Gregorian date string (YYYY-MM-DD) to a human-readable
 * Jalali string like "19 اردیبهشت 1405".
 */
function gregorianToJalaliStr(dateStr) {
  const [gy, gm, gd] = dateStr.split('-').map(Number);
  const { jy, jm, jd } = jalaali.toJalaali(gy, gm, gd);
  return formatJalali(jy, jm, jd);
}

/**
 * Convert Jalali (jy, jm, jd) to a Gregorian date string "YYYY-MM-DD".
 * Throws if the date is invalid.
 */
function jalaliToGregorian(jy, jm, jd) {
  const { gy, gm, gd } = jalaali.toGregorian(jy, jm, jd);
  return [gy, String(gm).padStart(2, '0'), String(gd).padStart(2, '0')].join('-');
}

/**
 * Format a Jalali date as "D MonthName YYYY".
 */
function formatJalali(jy, jm, jd) {
  return `${jd} ${MONTH_NAMES_FA[jm - 1]} ${jy}`;
}

/**
 * Return today's date as a Jalali string "D MonthName YYYY".
 */
function todayJalaliStr() {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return formatJalali(jy, jm, jd);
}

/**
 * Return today's date as a Gregorian "YYYY-MM-DD" string.
 */
function todayGregorianStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Parse a user-entered Jalali date string "YYYY/MM/DD".
 * Returns { jy, jm, jd } or throws on invalid input.
 */
function parseJalaliInput(text) {
  const parts = text.trim().split('/').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error('invalid format');
  const [jy, jm, jd] = parts;
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) throw new Error('out of range');
  return { jy, jm, jd };
}

module.exports = { gregorianToJalaliStr, jalaliToGregorian, formatJalali, todayJalaliStr, todayGregorianStr, parseJalaliInput };
