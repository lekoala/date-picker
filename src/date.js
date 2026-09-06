const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** @param {number} year */
export function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** @param {number} year @param {number} month */
export function daysInMonth(year, month) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Parse one canonical civil date.
 * @param {string} value
 * @returns {{year:number, month:number, day:number} | null}
 */
export function parseDate(value) {
  const match = DATE_RE.exec(String(value || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** @param {string} value */
export function isDate(value) {
  return parseDate(value) !== null;
}

/**
 * Normalize YYYY-MM or YYYY-MM-DD to YYYY-MM.
 * @param {string} value
 * @returns {string}
 */
export function monthKey(value) {
  const text = String(value || "");
  const monthMatch = MONTH_RE.exec(text);
  if (monthMatch) {
    const month = Number(monthMatch[2]);
    if (month >= 1 && month <= 12) return `${monthMatch[1]}-${String(month).padStart(2, "0")}`;
  }
  const parsed = parseDate(text);
  if (!parsed) throw new TypeError(`Invalid civil date/month: ${value}`);
  return `${String(parsed.year).padStart(4, "0")}-${String(parsed.month).padStart(2, "0")}`;
}

/** @param {number} year @param {number} month @param {number} day */
export function toISODate(year, month, day) {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (!isDate(value)) throw new TypeError(`Invalid civil date: ${value}`);
  return value;
}

/** @param {{year:number, month:number, day:number}} parts */
function toUTCDate(parts) {
  const date = new Date(0);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  return date;
}

/** @param {Date} date */
function fromUTCDate(date) {
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/** @param {string} value */
export function toIntlDate(value) {
  const parsed = parseDate(value);
  if (!parsed) throw new TypeError(`Invalid civil date: ${value}`);
  return toUTCDate(parsed);
}

/** @param {string} a @param {string} b */
export function compareDates(a, b) {
  if (!isDate(a) || !isDate(b)) throw new TypeError("compareDates() expects YYYY-MM-DD values");
  return a === b ? 0 : a < b ? -1 : 1;
}

/** @param {string} value @param {number} amount */
export function addDays(value, amount) {
  const parsed = parseDate(value);
  if (!parsed || !Number.isInteger(amount))
    throw new TypeError("addDays() expects a date and integer amount");
  const date = toUTCDate(parsed);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromUTCDate(date);
}

/** @param {string} value @param {number} amount */
export function addMonths(value, amount) {
  const parsed = parseDate(value);
  if (!parsed || !Number.isInteger(amount))
    throw new TypeError("addMonths() expects a date and integer amount");
  const absoluteMonth = parsed.year * 12 + (parsed.month - 1) + amount;
  const year = Math.floor(absoluteMonth / 12);
  const monthIndex = ((absoluteMonth % 12) + 12) % 12;
  const month = monthIndex + 1;
  const day = Math.min(parsed.day, daysInMonth(year, month));
  return toISODate(year, month, day);
}

/** @param {string} value @param {number} amount */
export function addYears(value, amount) {
  const parsed = parseDate(value);
  if (!parsed || !Number.isInteger(amount))
    throw new TypeError("addYears() expects a date and integer amount");
  const year = parsed.year + amount;
  const day = Math.min(parsed.day, daysInMonth(year, parsed.month));
  return toISODate(year, parsed.month, day);
}

/** @param {string} month @param {number} amount */
export function shiftMonth(month, amount) {
  const start = `${monthKey(month)}-01`;
  return monthKey(addMonths(start, amount));
}

/** @param {string} value */
export function startOfMonth(value) {
  return `${monthKey(value)}-01`;
}

/** @param {string} value */
export function endOfMonth(value) {
  const parsed = parseDate(`${monthKey(value)}-01`);
  if (!parsed) throw new TypeError(`Invalid month: ${value}`);
  return toISODate(parsed.year, parsed.month, daysInMonth(parsed.year, parsed.month));
}

/** 0=Sunday ... 6=Saturday. @param {string} value */
export function dayOfWeek(value) {
  const parsed = parseDate(value);
  if (!parsed) throw new TypeError(`Invalid civil date: ${value}`);
  return toUTCDate(parsed).getUTCDay();
}

/** @param {string} value @param {number} firstDay */
export function startOfWeek(value, firstDay = 1) {
  if (!Number.isInteger(firstDay) || firstDay < 0 || firstDay > 6)
    throw new RangeError("firstDay must be 0..6");
  const offset = (dayOfWeek(value) - firstDay + 7) % 7;
  return addDays(value, -offset);
}

/** @param {string} value @param {number} firstDay */
export function endOfWeek(value, firstDay = 1) {
  return addDays(startOfWeek(value, firstDay), 6);
}

/**
 * True civil weeks covering the anchor month: 4..6 full rows, never padded.
 * @param {string} value YYYY-MM or YYYY-MM-DD
 * @param {{firstDay?: number}} [options]
 */
export function getMonthWeeks(value, options = {}) {
  const firstDay = options.firstDay ?? 1;
  const start = startOfWeek(startOfMonth(value), firstDay);
  const end = endOfWeek(endOfMonth(value), firstDay);
  /** @type {string[][]} */
  const weeks = [];
  let cursor = start;
  while (compareDates(cursor, end) <= 0) {
    const week = [];
    for (let i = 0; i < 7; i++) week.push(addDays(cursor, i));
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

/** @param {string} value @param {string} [min] @param {string} [max] */
export function clampDate(value, min = "", max = "") {
  if (!isDate(value)) throw new TypeError(`Invalid civil date: ${value}`);
  if (min && compareDates(value, min) < 0) return min;
  if (max && compareDates(value, max) > 0) return max;
  return value;
}

/** Local civil date; no timezone conversion of the selected date model. */
export function todayISO() {
  const now = new Date();
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** ISO-8601 week number. @param {string} value */
export function isoWeekNumber(value) {
  const parsed = parseDate(value);
  if (!parsed) throw new TypeError(`Invalid civil date: ${value}`);
  const date = toUTCDate(parsed);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(0);
  yearStart.setUTCHours(12, 0, 0, 0);
  yearStart.setUTCFullYear(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
