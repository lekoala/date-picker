import { isDate, normalizeFirstDay, parseDate, toIntlDate, toISODate } from "./date.js";
import { createDateMask } from "./date-mask.js";

const BIDI = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;

/** @type {Map<string, Intl.DateTimeFormat>} */
const dateFormatters = new Map();
/** @type {Map<string, Map<string, string>>} */
const digitMaps = new Map();

/**
 * Bound retained locales/options even when an application cycles through many.
 * @template T
 * @param {Map<string, T>} cache @param {string} key @param {() => T} create
 * @returns {T}
 */
function cached(cache, key, create) {
  const existing = cache.get(key);
  if (existing !== undefined) return existing;
  const value = create();
  const oldest = cache.keys().next().value;
  if (cache.size >= 64 && oldest !== undefined) cache.delete(oldest);
  cache.set(key, value);
  return value;
}

/** @param {string} locale @param {Intl.DateTimeFormatOptions} options */
function dateFormatter(locale, options) {
  const key = JSON.stringify([locale, options]);
  return cached(dateFormatters, key, () => new Intl.DateTimeFormat(locale, options));
}

/** @param {string} [locale] */
export function resolveLocale(locale = "") {
  if (locale) return locale;
  if (typeof document !== "undefined" && document.documentElement.lang) return document.documentElement.lang;
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en-US";
}

/** @param {string} locale */
function digitMap(locale) {
  return cached(digitMaps, locale, () => {
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    const map = new Map();
    for (let i = 0; i <= 9; i++) map.set(formatter.format(i), String(i));
    return map;
  });
}

/**
 * @param {string} text @param {string} locale
 * @param {{trim?: boolean}} [options] `trim` defaults to true; literal segments
 * must keep their whitespace so the format's own spacing can be matched.
 */
function normalizeDigits(text, locale, options = {}) {
  let result = String(text || "").replace(BIDI, "");
  if (options.trim !== false) result = result.trim();
  for (const [local, ascii] of digitMap(locale)) result = result.split(local).join(ascii);
  return result;
}

/** @param {string} value @param {string} [locale] */
export function formatLongDate(value, locale = "") {
  const resolved = resolveLocale(locale);
  return dateFormatter(resolved, {
    calendar: "gregory",
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
  return dateFormatter(resolved, {
    calendar: "gregory",
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(toIntlDate(`${value.slice(0, 7)}-15`));
}

/**
 * Locale order of the visible month/year controls, derived from `Intl` so no
 * `showMonthAfterYear`-style option is needed. Year-like parts cover the
 * `relatedYear` / `yearName` variants some calendars expose; anything
 * unrecognized falls back to month-then-year. This is independent of `dir`:
 * the locale decides the linguistic order, direction only mirrors the layout.
 * @param {string} [locale] @returns {["month", "year"] | ["year", "month"]}
 */
export function monthYearOrder(locale = "") {
  const resolved = resolveLocale(locale);
  try {
    const parts = dateFormatter(resolved, {
      calendar: "gregory",
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    }).formatToParts(toIntlDate("2026-09-15"));
    let monthIndex = -1;
    let yearIndex = -1;
    parts.forEach((part, index) => {
      const type = /** @type {string} */ (part.type);
      if (type === "month") {
        if (monthIndex < 0) monthIndex = index;
      } else if (type === "year" || type === "relatedYear" || type === "yearName") {
        if (yearIndex < 0) yearIndex = index;
      }
    });
    if (monthIndex >= 0 && yearIndex >= 0)
      return yearIndex < monthIndex ? ["year", "month"] : ["month", "year"];
  } catch {
    // Fall through to the default below.
  }
  return ["month", "year"];
}

/** @param {string} [locale] @param {"long"|"short"} [style] */
export function monthNames(locale = "", style = "long") {
  const resolved = resolveLocale(locale);
  const formatter = dateFormatter(resolved, { calendar: "gregory", month: style, timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, index) =>
    formatter.format(toIntlDate(`2026-${String(index + 1).padStart(2, "0")}-15`)),
  );
}

/**
 * @param {string} [locale]
 * @param {number} [firstDay]
 * @param {"long"|"short"|"narrow"} [style]
 */
export function weekdayNames(locale = "", firstDay = 1, style = "short") {
  const resolved = resolveLocale(locale);
  const formatter = dateFormatter(resolved, {
    calendar: "gregory",
    weekday: style,
    timeZone: "UTC",
  });
  const normalized = normalizeFirstDay(firstDay);
  // 2026-01-04 is a Sunday.
  const sunday = toIntlDate("2026-01-04");
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday);
    date.setUTCDate(sunday.getUTCDate() + ((normalized + index) % 7));
    return formatter.format(date);
  });
}

/** @param {string} value */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Localized, editable numeric date adapter. The canonical value remains YYYY-MM-DD.
 *
 * Parsing stays tolerant on purpose: day and month accept one or two digits,
 * any of `"/"`, `"-"`, `"."` or a blank run separates the groups, and an
 * eight-digit compact entry is split using the locale's own widths. Component
 * order is never guessed: `10/29/2026` is invalid in `fr-BE`.
 *
 * `mask` is the entry mask for patterns that are exactly
 * `group separator group separator group` with a shared, simple separator.
 * Locales whose numeric format embeds spaces or a suffix (for example
 * `ko-KR` → `2026. 09. 06.`) keep plain typing: no `mask`, no auto separators.
 * @param {string} [locale]
 */
export function createDateAdapter(locale = "") {
  const resolved = resolveLocale(locale);
  const formatter = dateFormatter(resolved, {
    calendar: "gregory",
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
      // Literals keep their own spacing, so a run of blanks becomes an optional
      // separator: locales such as ko-KR ("2026. 09. 06.") or bg-BG ("... г.")
      // format with spaces the user may omit or retype.
      const literal = normalizeDigits(part.value, resolved, { trim: false });
      return escapeRegExp(literal).replace(/\s+/g, "\\s*");
    })
    .join("");
  // A mask needs the simplest shape: three numeric groups split by the same
  // literal, with no leading/trailing text and no embedded blanks.
  const rawLiterals = parts.filter((part) => part.type === "literal").map((part) => part.value);
  const literals = rawLiterals.map((literal) => normalizeDigits(literal, resolved, { trim: false }));
  const separator =
    order.length === 3 &&
    literals.length === 2 &&
    literals[0] === literals[1] &&
    literals[0].length > 0 &&
    !/[\s\d]/u.test(literals[0])
      ? literals[0]
      : "";
  const localDigits = [...digitMap(resolved)].reduce(
    (map, [local, ascii]) => map.set(ascii, local),
    new Map(),
  );
  // Render with the raw literal (bidi marks included) so a masked draft is
  // byte-for-byte what `format()` produces.
  const maskLiteral = separator ? rawLiterals[0] : "";
  const mask =
    separator && [...localDigits.values()].every((digit) => Array.from(digit).length === 1)
      ? createDateMask({
          order: /** @type {import("./date-mask.js").DateMaskPart[]} */ (order),
          separator: maskLiteral,
          toLocalDigit: (digit) => localDigits.get(digit) ?? digit,
          toAsciiText: (text) => normalizeDigits(text, resolved, { trim: false }),
        })
      : null;
  // Digits rendered by the mask must look exactly like `format()` output;
  // otherwise the mask would rewrite a correct value into a different string.
  const formattedSample = formatter.format(sample);
  const usableMask = mask && mask.render(mask.digits(formattedSample)) === formattedSample ? mask : null;
  const numericGroups = order.map((type) => (type === "year" ? "(\\d{4})" : "(\\d{1,2})"));
  const regex = separator
    ? new RegExp(`^\\s*${numericGroups.join(`[\\s/.\\-${escapeRegExp(separator)}]+`)}\\s*$`)
    : new RegExp(`^\\s*${pattern}\\s*$`);
  // Compact entry ("29102026") is split by the locale widths, never by guesswork.
  const compactRegex = new RegExp(
    `^\\s*${order.map((type) => (type === "year" ? "(\\d{4})" : "(\\d{2})")).join("")}\\s*$`,
  );

  return {
    locale: resolved,
    placeholder,
    /** Length of one complete formatted value, used as the field's `maxlength`. */
    entryLength: formattedSample.length,
    /** Entry mask for this locale, or null when the format is not maskable. */
    mask: usableMask,
    /** @param {string} value */
    format(value) {
      if (!isDate(value)) return "";
      return formatter.format(toIntlDate(value));
    },
    /** @param {string} text @returns {string} */
    parse(text) {
      const normalized = normalizeDigits(text, resolved);
      if (isDate(normalized)) return normalized;
      const match = compactRegex.exec(normalized) || regex.exec(normalized);
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
