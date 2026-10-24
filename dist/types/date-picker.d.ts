import { DateCalendarElement } from "./date-calendar.js";
export declare class DatePickerElement extends HTMLElement {
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
    /** @param {string} name @param {string|null} oldValue @param {string|null} newValue */
    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void;
    /** @public */
    get input(): HTMLInputElement | null | undefined;
    /** @public */
    get calendar(): DateCalendarElement | null;
    /** @public */
    get value(): string | undefined;
    set value(value: string | undefined);
    /** @public */
    get range(): {
        start: string;
        end: string;
    } | undefined;
    set range(value: {
        start: string;
        end: string;
    } | undefined);
    /** @public */
    get locale(): string;
    set locale(value: string);
    /** @public Visible month-name style forwarded to the popup calendar (`long` | `short`); anything else falls back to `long`. */
    get monthFormat(): "long" | "short";
    set monthFormat(value: string);
    /** @public */
    get min(): string;
    set min(value: string);
    /** @public */
    get max(): string;
    set max(value: string);
    /** @public */
    get openOnFocus(): boolean;
    set openOnFocus(value: boolean);
    /** @public */
    get open(): boolean;
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
    /** @public @returns {import("./date-calendar.js").DateSource | null} */
    get source(): import("./date-calendar.js").DateSource | null;
    set source(value: import("./date-calendar.js").DateSource | null);
    /** @public @returns {import("./date-calendar.js").DateStateResolver | null} */
    get dateState(): import("./date-calendar.js").DateStateResolver | null;
    set dateState(value: import("./date-calendar.js").DateStateResolver | null);
    /** @public @returns {import("./date-calendar.js").DayRenderer | null} */
    get renderDay(): import("./date-calendar.js").DayRenderer | null;
    set renderDay(value: import("./date-calendar.js").DayRenderer | null);
    /** @public @returns {import("./date-calendar.js").DateDisabledPredicate | null} */
    get isDateDisabled(): import("./date-calendar.js").DateDisabledPredicate | null;
    set isDateDisabled(value: import("./date-calendar.js").DateDisabledPredicate | null);
    /** @public JS-only coordinate-space policy: "viewport" by default, "document" as an explicit opt-in; a change made while open applies to the next opening only. @returns {"viewport" | "document"} */
    get coordinateSpace(): "viewport" | "document";
    set coordinateSpace(value: "viewport" | "document");
    /** @public */
    validate(): Promise<boolean>;
    /** @public @param {{moveFocus?:boolean, endpoint?:"start"|"end", returnFocus?:HTMLElement}} [options] */
    show(options?: {
        moveFocus?: boolean;
        endpoint?: "start" | "end";
        returnFocus?: HTMLElement;
    }): void;
    /** @public @param {boolean} [restoreFocus] */
    hide(restoreFocus?: boolean): void;
}
