import { CalendarModel } from "./calendar-model.js";
export type DateRange = {
    start: string;
    end: string;
};
export type DateState = Record<string, unknown> & {
    disabled?: boolean;
    description?: string;
};
export type DateLoader = (range: DateRange, context: {
    signal: AbortSignal;
}) => unknown | Promise<unknown>;
export type DateSource = DateLoader | {
    load: DateLoader;
};
export type DateStateResolver = (date: string, sourceState: DateState) => DateState | null | undefined;
export type DayRenderer = (date: string, state: DateState) => Node | string | null | undefined;
export type DateDisabledPredicate = (date: string) => boolean;
/**
 * Public inline calendar primitive.
 *
 * State contract:
 * - display: month being rendered (YYYY-MM)
 * - focusedDate: roving keyboard target (YYYY-MM-DD)
 * - value: selected date (YYYY-MM-DD or empty)
 * - highlightedRange: presentation-only range band (never touches the other state)
 * - dateactivate: user explicitly activated one date
 */
/** @typedef {{start:string,end:string}} DateRange */
/** @typedef {Record<string, unknown> & {disabled?:boolean, description?:string}} DateState */
/** @typedef {(range:DateRange, context:{signal:AbortSignal}) => unknown | Promise<unknown>} DateLoader */
/** @typedef {DateLoader | {load:DateLoader}} DateSource */
/** @typedef {(date:string, sourceState:DateState) => DateState | null | undefined} DateStateResolver */
/** @typedef {(date:string, state:DateState) => Node | string | null | undefined} DayRenderer */
/** @typedef {(date:string) => boolean} DateDisabledPredicate */
export declare class DateCalendarElement extends HTMLElement {
    _id: string;
    _model: CalendarModel;
    _connected: boolean;
    _rendering: boolean;
    /** @type {DateSource | null} */
    _source: DateSource | null;
    _sourceStates: Map<any, any>;
    _loadedRanges: Set<any>;
    _loadController: AbortController | null;
    _loadingKey: string;
    /** @type {Promise<"loaded" | "cancelled" | "failed"> | null} */
    _loadingPromise: Promise<"loaded" | "cancelled" | "failed"> | null;
    /** @type {DateStateResolver | null} */
    _dateState: DateStateResolver | null;
    /** @type {DayRenderer | null} */
    _renderDay: DayRenderer | null;
    /** @type {DateDisabledPredicate | null} */
    _isDateDisabled: DateDisabledPredicate | null;
    /** @type {DateRange} */
    _highlightedRange: DateRange;
    _messages: {
        chooseDate: string;
        changeDate: string;
        previousMonth: string;
        nextMonth: string;
        month: string;
        year: string;
        calendar: string;
        unavailable: string;
        invalidDate: string;
        unavailableDate: string;
        formatHint: string;
        week: string;
        rangeStart: string;
        rangeInRange: string;
        rangeEnd: string;
        rangeSingle: string;
        rangeOrderStart: string;
        rangeOrderEnd: string;
    };
    static observedAttributes: string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
    /** @public */
    get locale(): string;
    set locale(value: string);
    /** @public */
    get value(): string;
    set value(value: string);
    /** @public */
    get display(): string;
    set display(value: string);
    /** @public */
    get focusedDate(): string;
    set focusedDate(value: string);
    /** @public */
    get min(): string;
    set min(value: string);
    /** @public */
    get max(): string;
    set max(value: string);
    /** @public */
    get firstDay(): number;
    set firstDay(value: number);
    /** @public */
    get selection(): "none" | "single";
    set selection(value: string);
    /** @public Visible month-name style in the month select (`long` | `short`); anything else falls back to `long`. The accessible grid heading always keeps the long month/year form. */
    get monthFormat(): "long" | "short";
    set monthFormat(value: string);
    /** @public */
    get highlightedRange(): {
        start: string;
        end: string;
    };
    set highlightedRange(value: {
        start: string;
        end: string;
    });
    /** @public */
    get fixedWeeks(): boolean;
    set fixedWeeks(value: boolean);
    /** @public */
    get showWeekNumbers(): boolean;
    set showWeekNumbers(value: boolean);
    /** @public */
    get messages(): {
        chooseDate: string;
        changeDate: string;
        previousMonth: string;
        nextMonth: string;
        month: string;
        year: string;
        calendar: string;
        unavailable: string;
        invalidDate: string;
        unavailableDate: string;
        formatHint: string;
        week: string;
        rangeStart: string;
        rangeInRange: string;
        rangeEnd: string;
        rangeSingle: string;
        rangeOrderStart: string;
        rangeOrderEnd: string;
    };
    set messages(value: {
        chooseDate: string;
        changeDate: string;
        previousMonth: string;
        nextMonth: string;
        month: string;
        year: string;
        calendar: string;
        unavailable: string;
        invalidDate: string;
        unavailableDate: string;
        formatHint: string;
        week: string;
        rangeStart: string;
        rangeInRange: string;
        rangeEnd: string;
        rangeSingle: string;
        rangeOrderStart: string;
        rangeOrderEnd: string;
    });
    /** @public @returns {DateSource | null} */
    get source(): DateSource | null;
    set source(value: DateSource | null);
    /** @public @returns {DateStateResolver | null} */
    get dateState(): DateStateResolver | null;
    set dateState(value: DateStateResolver | null);
    /** @public @returns {DayRenderer | null} */
    get renderDay(): DayRenderer | null;
    set renderDay(value: DayRenderer | null);
    /** @public @returns {DateDisabledPredicate | null} */
    get isDateDisabled(): DateDisabledPredicate | null;
    set isDateDisabled(value: DateDisabledPredicate | null);
    _syncModel(): void;
    /** @param {string} name @param {string} value */
    _reflect(name: string, value: string): void;
    /** @param {string} value */
    _clamp(value: string): string;
    _weeks(display?: string): string[][];
    /** @param {HTMLElement} element @returns {string} */
    _focusTargetKey(element: HTMLElement): string;
    /** @param {string} [display] */
    _range(display?: string): {
        start: string;
        end: string;
    };
    /** @public @param {string} date */
    getDateState(date: string): any;
    /** @public */
    refreshSource(): Promise<void>;
    /** @public Ensure source state exists for the month containing a typed/selected date.
     * @param {string} date @returns {Promise<boolean>} */
    ensureDate(date: string): Promise<boolean>;
    /** @param {string} display @param {boolean} [rerender] @returns {Promise<"loaded" | "cancelled" | "failed">} */
    _loadDisplay(display: string, rerender?: boolean): Promise<"loaded" | "cancelled" | "failed">;
    /** @param {string} display @param {{emit?:boolean}} [options] */
    _setDisplay(display: string, options?: {
        emit?: boolean;
    }): string;
    _emitDisplayChange(): void;
    /** @public */
    previousMonth(): string;
    /** @public */
    nextMonth(): string;
    /** @public @param {string} date @param {{moveFocus?:boolean}} [options] */
    focusDate(date: string, options?: {
        moveFocus?: boolean;
    }): void;
    /** @param {string} previous @param {string} next @param {boolean} [moveFocus] */
    _moveFocusDom(previous: string, next: string, moveFocus?: boolean): void;
    /** @param {string} previousValue @param {string} nextValue */
    _moveSelectionDom(previousValue: string, nextValue: string): boolean;
    /** @public */
    focusGrid(): void;
    /** @param {string} date @returns {Promise<boolean>} */
    _activate(date: string): Promise<boolean>;
    /** @param {MouseEvent} event */
    _onClick(event: MouseEvent): void;
    /** @param {Event} event */
    _onChange(event: Event): void;
    /** @param {FocusEvent} event */
    _onFocusIn(event: FocusEvent): void;
    /** @param {KeyboardEvent} event */
    _onKeyDown(event: KeyboardEvent): void;
    /** @public @param {boolean} [load] */
    render(load?: boolean): void;
}
//# sourceMappingURL=date-calendar.d.ts.map