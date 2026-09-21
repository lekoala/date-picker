export type DateRange = {
    start: string;
    end: string;
};
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
export declare function normalizeRange(range: {
    start?: string;
    end?: string;
} | null | undefined): DateRange;
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
export declare function rangePosition(date: string, range: DateRange | null | undefined): "" | "start" | "in" | "end" | "single";
export type RangeTransition = {
    status: "pending" | "complete" | "refused";
    /**
     * primary bound the transition speaks through
     */
    endpoint: "start" | "end";
    /**
     * bounds whose value actually moves
     */
    changedEndpoints: ("start" | "end")[];
    /**
     * the whole resulting pair, not only the moved bound
     */
    range: DateRange;
    /**
     * bound the next pick would target
     */
    activeEndpoint: "" | "start" | "end";
    /**
     * the workflow cannot continue in the popup
     */
    close?: boolean;
};
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
export declare class DateRangeController {
    /** @type {"" | "start" | "end"} */
    activeEndpoint: "" | "start" | "end";
    start: string;
    end: string;
    constructor();
    /** @returns {DateRange} */
    get range(): DateRange;
    /** Whether both bounds exist and are ordered (start <= end). */
    get complete(): boolean;
    /** @param {"" | "start" | "end"} endpoint */
    focus(endpoint: "" | "start" | "end"): void;
    /** @param {"start" | "end"} endpoint @returns {RangeTransition} */
    _refuse(endpoint: "start" | "end"): RangeTransition;
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
    project(date: string, editable?: (bound: "start" | "end") => boolean): RangeTransition;
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
    projectEndpoint(date: string, endpoint: "start" | "end", editable?: (bound: "start" | "end") => boolean): RangeTransition;
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
    previewRange(date: string, endpoint?: "" | "start" | "end", editable?: (bound: "start" | "end") => boolean): DateRange | null;
    /** @param {RangeTransition} transition @returns {RangeTransition} */
    _apply(transition: RangeTransition): RangeTransition;
    /**
     * Apply one grid activation through the active endpoint.
     * @param {string} date
     * @param {(bound: "start" | "end") => boolean} [editable]
     * @returns {RangeTransition}
     */
    activate(date: string, editable?: (bound: "start" | "end") => boolean): RangeTransition;
    /**
     * Apply a direct move of one bound (endpoint drag).
     * @param {string} date
     * @param {"start" | "end"} endpoint
     * @param {(bound: "start" | "end") => boolean} [editable]
     * @returns {RangeTransition}
     */
    moveEndpoint(date: string, endpoint: "start" | "end", editable?: (bound: "start" | "end") => boolean): RangeTransition;
}
/**
 * Link two date pickers without teaching either picker about its sibling.
 * Effective constraint: end >= start and start <= end.
 * @param {import("./date-picker.js").DatePickerElement} start
 * @param {import("./date-picker.js").DatePickerElement} end
 * @returns {() => void}
 */
export declare function linkDateRange(start: import("./date-picker.js").DatePickerElement, end: import("./date-picker.js").DatePickerElement): () => void;
//# sourceMappingURL=date-range.d.ts.map