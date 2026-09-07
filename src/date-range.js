import { compareDates, isDate } from "./date.js";

/** @typedef {{start:string, end:string}} DateRange */

/**
 * Validate and normalize a range for display.
 *
 * - `null` and `{ start: "", end: "" }` reset the range;
 * - `start` and `end` are canonical `YYYY-MM-DD` strings;
 * - `end` may be empty (range in progress);
 * - the range is never reordered here: an inversion or an `end` without a
 *   `start` is a programming error and is rejected.
 * @param {{start?:string, end?:string}|null|undefined} range
 * @returns {DateRange}
 */
export function normalizeRange(range) {
  if (range == null) return { start: "", end: "" };
  if (typeof range !== "object") throw new TypeError("highlightedRange expects { start, end }");
  const { start = "", end = "" } = range;
  if (start && !isDate(start)) throw new TypeError(`Invalid range start: ${start}`);
  if (end && !isDate(end)) throw new TypeError(`Invalid range end: ${end}`);
  if (!start && end) throw new TypeError("highlightedRange cannot define an end without a start");
  if (start && end && compareDates(end, start) < 0)
    throw new TypeError("highlightedRange must be ordered; start must be on or before end");
  return { start, end };
}

/**
 * Position of one day within a displayable range.
 *
 * A single-day range (`start === end`) cannot be both endpoints at once, so it
 * returns `"single"`; the caller renders it as both `data-range-start` and
 * `data-range-end`. A start-only range (in-progress) returns `"start"`.
 * @param {string} date
 * @param {DateRange|null|undefined} range
 * @returns {"" | "start" | "in" | "end" | "single"}
 */
export function rangePosition(date, range) {
  if (!range || !isDate(date)) return "";
  const { start, end } = range;
  if (!start || !isDate(start)) return "";
  if (start === date) return end ? (end === date ? "single" : "start") : "start";
  if (end && end === date) return "end";
  if (end && compareDates(date, start) >= 0 && compareDates(date, end) <= 0) return "in";
  return "";
}

/** @param {string} a @param {string} b */
function later(a, b) {
  if (!a) return b;
  if (!b) return a;
  return compareDates(a, b) >= 0 ? a : b;
}

/** @param {string} a @param {string} b */
function earlier(a, b) {
  if (!a) return b;
  if (!b) return a;
  return compareDates(a, b) <= 0 ? a : b;
}

/**
 * Link two date pickers without teaching either picker about its sibling.
 * Effective constraint: end >= start and start <= end.
 * @param {import("./date-picker.js").DatePickerElement} start
 * @param {import("./date-picker.js").DatePickerElement} end
 * @returns {() => void}
 */
export function linkDateRange(start, end) {
  const baseStartMax = start.max;
  const baseEndMin = end.min;

  const sync = () => {
    const startValue = isDate(start.value) ? start.value : "";
    const endValue = isDate(end.value) ? end.value : "";
    end.min = later(baseEndMin, startValue);
    start.max = earlier(baseStartMax, endValue);
    void start.validate();
    void end.validate();
  };

  start.addEventListener("valuechange", sync);
  end.addEventListener("valuechange", sync);
  sync();

  return () => {
    start.removeEventListener("valuechange", sync);
    end.removeEventListener("valuechange", sync);
    start.max = baseStartMax;
    end.min = baseEndMin;
  };
}
