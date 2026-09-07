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

/**
 * Pure two-bound state machine for the shared-calendar range picker. Covers
 * start/end state and the active-endpoint transition rules; it knows nothing
 * about DOM, popups or async availability.
 *
 * Interaction contract (U9):
 * - opening through a field targets that bound;
 * - a pick outside a complete range extends the corresponding bound;
 * - otherwise activating through `end` refuses a date before `start`;
 * - activating through `start` commits `start`, moves the active endpoint to
 *   `end` and leaves the popup open for the second selection.
 *
 * The business range may be temporarily incomplete or inverted; it is the
 * coordinator's job to forward only a displayable range to
 * `calendar.highlightedRange`.
 */
export class DateRangeController {
  constructor() {
    /** @type {"" | "start" | "end"} */
    this.activeEndpoint = "";
    this.start = "";
    this.end = "";
  }

  /** @returns {{start:string, end:string}} */
  get range() {
    return { start: this.start, end: this.end };
  }

  /** Whether both bounds exist and are ordered (start <= end). */
  get complete() {
    return Boolean(this.start && this.end && compareDates(this.end, this.start) >= 0);
  }

  /** @param {"" | "start" | "end"} endpoint */
  focus(endpoint) {
    this.activeEndpoint = endpoint;
  }

  /**
   * Process one grid activation through the active endpoint.
   *
   * `editable(bound)` reports whether a bound can receive a user pick. It
   * guards every commit and the `start -> end` transition: when the next bound
   * is uneditable the returned result carries `close: true` instead of leaving
   * the popup targeting a bound that can never change. `status: "complete"`
   * stays reserved for an actually ordered pair.
   * @param {string} date
   * @param {(bound: "start" | "end") => boolean} [editable]
   * @returns {{status: "pending" | "complete" | "refused", endpoint: "start" | "end", close?: boolean}}
   */
  activate(date, editable = () => true) {
    if (!isDate(date)) throw new TypeError(`Invalid range activation: ${date}`);
    if (this.complete && (compareDates(date, this.start) < 0 || compareDates(date, this.end) > 0)) {
      const endpoint = compareDates(date, this.start) < 0 ? "start" : "end";
      if (!editable(endpoint)) return { status: "refused", endpoint };
      this[endpoint] = date;
      this.activeEndpoint = endpoint;
      return { status: "complete", endpoint };
    }
    if (this.activeEndpoint === "end") {
      if (this.start && compareDates(date, this.start) < 0) {
        return { status: "refused", endpoint: "end" };
      }
      if (!editable("end")) return { status: "refused", endpoint: "end" };
      this.end = date;
      return { status: this.start ? "complete" : "pending", endpoint: "end" };
    }
    if (!editable("start")) return { status: "refused", endpoint: "start" };
    this.start = date;
    if (!editable("end")) {
      // The range stays incomplete but must close: the next bound cannot
      // receive the complementary pick.
      return { status: "pending", endpoint: "start", close: true };
    }
    this.activeEndpoint = "end";
    return { status: "pending", endpoint: "start" };
  }
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
    const startValue = typeof start.value === "string" && isDate(start.value) ? start.value : "";
    const endValue = typeof end.value === "string" && isDate(end.value) ? end.value : "";
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
