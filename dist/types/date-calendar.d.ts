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
    static observedAttributes: string[];
    /** @public @param {Partial<import("./control-classes.js").ControlClasses>} classes */
    static setDefaultControlClasses(classes: Partial<import("./control-classes.js").ControlClasses>): void;
    /** @public */
    static getDefaultControlClasses(): {
        month: string;
        year: string;
        nav: string;
    };
    /** @public @param {Partial<typeof import("./messages.js").DEFAULT_MESSAGES>} messages */
    static setDefaultMessages(messages: Partial<typeof import("./messages.js").DEFAULT_MESSAGES>): void;
    /** @public */
    static getDefaultMessages(): {
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
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    /** @param {string} name @param {string|null} _oldValue @param {string|null} newValue */
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void;
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
    /**
     * Author classes for header controls; omitted roles follow current global defaults.
     * @public
     * @returns {import("./control-classes.js").ControlClasses}
     */
    get controlClasses(): import("./control-classes.js").ControlClasses;
    /** @param {Partial<import("./control-classes.js").ControlClasses> | null} value */
    set controlClasses(value: Partial<import("./control-classes.js").ControlClasses> | null);
    /** @public @returns {typeof import("./messages.js").DEFAULT_MESSAGES} */
    get messages(): typeof import("./messages.js").DEFAULT_MESSAGES;
    /** @param {Partial<typeof import("./messages.js").DEFAULT_MESSAGES> | null} value */
    set messages(value: Partial<typeof import("./messages.js").DEFAULT_MESSAGES> | null);
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
    /** @public @param {string} date @returns {DateState & {disabled: boolean}} */
    getDateState(date: string): DateState & {
        disabled: boolean;
    };
    /** @public */
    refreshSource(): Promise<void>;
    /** @public Ensure source state exists for the month containing a typed/selected date.
     * @param {string} date @returns {Promise<boolean>} */
    ensureDate(date: string): Promise<boolean>;
    /** @public */
    previousMonth(): string;
    /** @public */
    nextMonth(): string;
    /** @public @param {string} date @param {{moveFocus?:boolean}} [options] */
    focusDate(date: string, options?: {
        moveFocus?: boolean;
    }): void;
    /** @public */
    focusGrid(): void;
    /**
     * Run one explicit activation: availability check, then the cancelable
     * `dateactivate` seam, then selection. Click, keyboard and any other input
     * device share this single path, so an application that cancels
     * `dateactivate` cannot be bypassed by a new interaction.
     * @public
     * @param {string} date @returns {Promise<boolean>}
     */
    activateDate(date: string): Promise<boolean>;
    /** @public @param {boolean} [load] */
    render(load?: boolean): void;
}
