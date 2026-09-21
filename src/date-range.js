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
 * @typedef {object} RangeTransition
 * @property {"pending" | "complete" | "refused"} status
 * @property {"start" | "end"} endpoint primary bound the transition speaks through
 * @property {("start" | "end")[]} changedEndpoints bounds whose value actually moves
 * @property {DateRange} range the whole resulting pair, not only the moved bound
 * @property {"" | "start" | "end"} activeEndpoint bound the next pick would target
 * @property {boolean} [close] the workflow cannot continue in the popup
 */

/**
 * Pure two-bound state machine for the shared-calendar range picker. Covers
 * start/end state and the active-endpoint transition rules; it knows nothing
 * about DOM, popups or async availability.
 *
 * Interaction contract:
 * - opening through a field targets that bound;
 * - a pick outside a complete range extends the corresponding bound;
 * - while a range is being created (`start` set, no `end`), a second pick
 *   before the anchor is sorted into `date -> start` instead of refused:
 *   calendar interaction never produces an inverted range;
 * - an explicit change to one bound of an already complete pair keeps that
 *   bound's identity, so moving `end` before `start` is refused rather than
 *   silently rewriting the other field;
 * - activating through `start` commits `start`, moves the active endpoint to
 *   `end` and leaves the popup open for the second selection.
 *
 * Each rule exists once, as a `project*()` projection; `activate()` and
 * `moveEndpoint()` only apply one. Hover, keyboard and drag previews read the
 * same projections, so a second copy of the interaction rules cannot drift
 * into the DOM layer.
 *
 * Text entry is deliberately outside this machine: a typed pair may be
 * temporarily inverted and report a validation error. It is the coordinator's
 * job to forward only a displayable range to `calendar.highlightedRange`.
 */
export class DateRangeController {
  constructor() {
    /** @type {"" | "start" | "end"} */
    this.activeEndpoint = "";
    this.start = "";
    this.end = "";
  }

  /** @returns {DateRange} */
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

  /** @param {"start" | "end"} endpoint @returns {RangeTransition} */
  _refuse(endpoint) {
    return {
      status: "refused",
      endpoint,
      changedEndpoints: [],
      range: this.range,
      activeEndpoint: this.activeEndpoint,
    };
  }

  /**
   * Project one grid activation through the active endpoint, without mutating.
   *
   * `editable(bound)` reports whether a bound can receive a user pick. It
   * guards every commit and the `start -> end` transition: when the next bound
   * is uneditable the returned transition carries `close: true` instead of
   * leaving the popup targeting a bound that can never change. `status:
   * "complete"` stays reserved for an actually ordered pair.
   * @param {string} date
   * @param {(bound: "start" | "end") => boolean} [editable]
   * @returns {RangeTransition}
   */
  project(date, editable = () => true) {
    if (!isDate(date)) throw new TypeError(`Invalid range activation: ${date}`);
    const { start, end } = this;
    if (this.complete && (compareDates(date, start) < 0 || compareDates(date, end) > 0)) {
      const endpoint = compareDates(date, start) < 0 ? "start" : "end";
      if (!editable(endpoint)) return this._refuse(endpoint);
      return {
        status: "complete",
        endpoint,
        changedEndpoints: [endpoint],
        range: endpoint === "start" ? { start: date, end } : { start, end: date },
        activeEndpoint: endpoint,
      };
    }
    if (this.activeEndpoint === "end") {
      if (start && !end && compareDates(date, start) < 0) {
        // Second pick of a range being created: sort it instead of refusing.
        // Both bounds move at once, which is why a transition has to describe
        // the whole pair rather than a single endpoint.
        if (!editable("start")) return this._refuse("start");
        if (!editable("end")) return this._refuse("end");
        return {
          status: "complete",
          endpoint: "end",
          changedEndpoints: ["start", "end"],
          range: { start: date, end: start },
          activeEndpoint: "end",
        };
      }
      // An existing pair keeps each bound's identity: an `end` before `start`
      // is refused rather than rewriting `start` behind the user's back.
      if (start && compareDates(date, start) < 0) return this._refuse("end");
      if (!editable("end")) return this._refuse("end");
      return {
        status: start ? "complete" : "pending",
        endpoint: "end",
        changedEndpoints: ["end"],
        range: { start, end: date },
        activeEndpoint: "end",
      };
    }
    if (end && !start && compareDates(date, end) > 0) {
      // Mirror of the end-side sort, for a range anchored by its end: no
      // calendar interaction may produce an inverted pair, from either side.
      if (!editable("start")) return this._refuse("start");
      if (!editable("end")) return this._refuse("end");
      return {
        status: "complete",
        endpoint: "start",
        changedEndpoints: ["start", "end"],
        range: { start: end, end: date },
        activeEndpoint: "start",
      };
    }
    if (!editable("start")) return this._refuse("start");
    const canContinue = editable("end");
    return {
      status: "pending",
      endpoint: "start",
      changedEndpoints: ["start"],
      range: { start: date, end },
      activeEndpoint: canContinue ? "end" : this.activeEndpoint,
      // The range stays incomplete but must close: the next bound cannot
      // receive the complementary pick.
      ...(canContinue ? {} : { close: true }),
    };
  }

  /**
   * Project a direct move of one bound (endpoint drag), without mutating.
   *
   * Only a complete, ordered pair offers two handles to grab, and a handle
   * never crosses the other one: the candidate is clamped to the opposite
   * bound, so the previewed band is exactly what a drop commits. Equality is
   * allowed (a one-day range).
   * @param {string} date
   * @param {"start" | "end"} endpoint
   * @param {(bound: "start" | "end") => boolean} [editable]
   * @returns {RangeTransition}
   */
  projectEndpoint(date, endpoint, editable = () => true) {
    if (!isDate(date)) throw new TypeError(`Invalid range activation: ${date}`);
    if (!this.complete || !editable(endpoint)) return this._refuse(endpoint);
    const { start, end } = this;
    const previous = endpoint === "start" ? start : end;
    const target = endpoint === "start" ? earlier(date, end) : later(date, start);
    return {
      status: "complete",
      endpoint,
      changedEndpoints: target === previous ? [] : [endpoint],
      range: endpoint === "start" ? { start: target, end } : { start, end: target },
      activeEndpoint: endpoint,
    };
  }

  /**
   * Displayable band a candidate date would produce, or `null` when there is
   * nothing to promise. Single source of truth for hover, keyboard and drag
   * previews: the projection rules with no mutation and no event.
   *
   * Without a drag handle a preview only speaks during range creation, when
   * exactly one bound is anchored and the other is still open. An empty range
   * has no anchor to project from, and a complete pair is not a promise in
   * progress — previewing it would repaint the committed band on every hover.
   * @param {string} date
   * @param {"" | "start" | "end"} [endpoint] drag handle, empty for a normal pick
   * @param {(bound: "start" | "end") => boolean} [editable]
   * @returns {DateRange | null}
   */
  previewRange(date, endpoint = "", editable = () => true) {
    if (!isDate(date)) return null;
    if (!endpoint && Boolean(this.start) === Boolean(this.end)) return null;
    const transition = endpoint
      ? this.projectEndpoint(date, endpoint, editable)
      : this.project(date, editable);
    if (transition.status === "refused") return null;
    const { start, end } = transition.range;
    if (!start || (end && compareDates(end, start) < 0)) return null;
    return { start, end };
  }

  /** @param {RangeTransition} transition @returns {RangeTransition} */
  _apply(transition) {
    if (transition.status === "refused") return transition;
    this.start = transition.range.start;
    this.end = transition.range.end;
    this.activeEndpoint = transition.activeEndpoint;
    return transition;
  }

  /**
   * Apply one grid activation through the active endpoint.
   * @param {string} date
   * @param {(bound: "start" | "end") => boolean} [editable]
   * @returns {RangeTransition}
   */
  activate(date, editable = () => true) {
    return this._apply(this.project(date, editable));
  }

  /**
   * Apply a direct move of one bound (endpoint drag).
   * @param {string} date
   * @param {"start" | "end"} endpoint
   * @param {(bound: "start" | "end") => boolean} [editable]
   * @returns {RangeTransition}
   */
  moveEndpoint(date, endpoint, editable = () => true) {
    return this._apply(this.projectEndpoint(date, endpoint, editable));
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
