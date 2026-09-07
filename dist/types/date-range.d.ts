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
export declare class DateRangeController {
    /** @type {"" | "start" | "end"} */
    activeEndpoint: "" | "start" | "end";
    start: string;
    end: string;
    constructor();
    /** @returns {{start:string, end:string}} */
    get range(): {
        start: string;
        end: string;
    };
    /** Whether both bounds exist and are ordered (start <= end). */
    get complete(): boolean;
    /** @param {"" | "start" | "end"} endpoint */
    focus(endpoint: "" | "start" | "end"): void;
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
    activate(date: string, editable?: (bound: "start" | "end") => boolean): {
        status: "pending" | "complete" | "refused";
        endpoint: "start" | "end";
        close?: boolean;
    };
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