import { isDate, parseDate, toIntlDate, toISODate } from "./date.js";

const BIDI = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

/** @param {string} [locale] */
export function resolveLocale(locale = "") {
  if (locale) return locale;
  if (typeof document !== "undefined" && document.documentElement.lang) return document.documentElement.lang;
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en-US";
}

/** @param {string} locale */
function digitMap(locale) {
  const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
  const map = new Map();
  for (let i = 0; i <= 9; i++) map.set(formatter.format(i), String(i));
  return map;
}

/** @param {string} text @param {string} locale */
function normalizeDigits(text, locale) {
  let result = String(text || "").replace(BIDI, "").trim();
  for (const [local, ascii] of digitMap(locale)) result = result.split(local).join(ascii);
  return result;
}

/** @param {string} value @param {string} [locale] */
export function formatLongDate(value, locale = "") {
  const resolved = resolveLocale(locale);
  return new Intl.DateTimeFormat(resolved, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(toIntlDate(value));
}

/** @param {string} value @param {string} [locale] */
export function formatMonthYear(value, locale = "") {
  const resolved = resolveLocale(locale);
  return new Intl.DateTimeFormat(resolved, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(toIntlDate(`${value.slice(0, 7)}-15`));
}

/** @param {string} [locale] @param {"long"|"short"} [style] */
export function monthNames(locale = "", style = "long") {
  const resolved = resolveLocale(locale);
  const formatter = new Intl.DateTimeFormat(resolved, { month: style, timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, index) => formatter.format(toIntlDate(`2026-${String(index + 1).padStart(2, "0")}-15`)));
}

/**
 * @param {string} [locale]
 * @param {number} [firstDay]
 * @param {"long"|"short"|"narrow"} [style]
 */
export function weekdayNames(locale = "", firstDay = 1, style = "short") {
  const resolved = resolveLocale(locale);
  const formatter = new Intl.DateTimeFormat(resolved, { weekday: style, timeZone: "UTC" });
  // 2026-01-04 is a Sunday.
  const sunday = toIntlDate("2026-01-04");
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setUTCDate(sunday.getUTCDate() + ((firstDay + index) % 7));
    return formatter.format(date);
  });
}

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Localized, editable numeric date adapter. The canonical value remains YYYY-MM-DD.
 * @param {string} [locale]
 */
export function createDateAdapter(locale = "") {
  const resolved = resolveLocale(locale);
  const formatter = new Intl.DateTimeFormat(resolved, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });
  const sample = toIntlDate("2006-11-22");
  const parts = formatter.formatToParts(sample).filter((part) => part.type !== "literal" || part.value);
  const order = parts.filter((part) => ["day", "month", "year"].includes(part.type)).map((part) => part.type);
  const placeholder = parts
    .map((part) => {
      if (part.type === "day") return "DD";
      if (part.type === "month") return "MM";
      if (part.type === "year") return "YYYY";
      return part.value.replace(BIDI, "");
    })
    .join("");
  const pattern = parts
    .map((part) => {
      if (part.type === "day" || part.type === "month") return "(\\d{1,2})";
      if (part.type === "year") return "(\\d{4})";
      const literal = normalizeDigits(part.value, resolved).replace(/\s+/g, " ");
      return escapeRegExp(literal).replace(/\\ /g, "\\s*");
    })
    .join("");
  const regex = new RegExp(`^\\s*${pattern}\\s*$`);

  return {
    locale: resolved,
    placeholder,
    /** @param {string} value */
    format(value) {
      if (!isDate(value)) return "";
      return formatter.format(toIntlDate(value));
    },
    /** @param {string} text @returns {string} */
    parse(text) {
      const normalized = normalizeDigits(text, resolved);
      if (isDate(normalized)) return normalized;
      const match = regex.exec(normalized);
      if (!match) return "";
      /** @type {Record<string, number>} */
      const values = {};
      order.forEach((type, index) => {
        values[type] = Number(match[index + 1]);
      });
      if (!values.year || !values.month || !values.day) return "";
      try {
        return toISODate(values.year, values.month, values.day);
      } catch {
        return "";
      }
    },
  };
}

/** @param {string} value */
export function dateParts(value) {
  return parseDate(value);
}
