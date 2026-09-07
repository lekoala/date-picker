import { DateCalendarElement } from "./date-calendar.js";
import { DateFieldController } from "./date-field.js";
import { DateRangeController } from "./date-range.js";
export declare class DatePickerElement extends HTMLElement {
    _id: string;
    _connected: boolean;
    _reflecting: boolean;
    _value: string;
    _input: HTMLInputElement | null;
    /** @type {DateFieldController | null} */
    _field: DateFieldController | null;
    /** @type {DateFieldController[] | null} */
    _fields: DateFieldController[] | null;
    /** @type {DateRangeController | null} */
    _range: DateRangeController | null;
    _orderTags: Set<any>;
    /** @type {"" | "start" | "end"} */
    _lastFocusEndpoint: "" | "start" | "end";
    _rangeCommitId: number;
    /** Map of clicked/keyboard-activated grid dates to the generation at click
     * time (range mode supersession/stale protection). @type {Map<string, number>} */
    _pendingIntents: Map<string, number>;
    _button: HTMLButtonElement | null;
    _panel: HTMLDivElement | null;
    _calendar: DateCalendarElement | null;
    _originalDescribedBy: string;
    _rangeOriginalDescribedBy: string[];
    _formatHint: HTMLSpanElement | null;
    _generatedPlaceholder: boolean;
    _controller: AbortController | null;
    _stopTracking: (() => void) | null;
    _open: boolean;
    _suppressFocusOpen: boolean;
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
    /** @type {any} */
    _source: any;
    /** @type {any} */
    _dateState: any;
    /** @type {any} */
    _renderDay: any;
    /** @type {any} */
    _isDateDisabled: any;
    static observedAttributes: string[];
    constructor();
    _rangeMode(): boolean;
    connectedCallback(): void;
    _connectSingle(): void;
    _connectRange(): void;
    disconnectedCallback(): void;
    /** @param {DateFieldController | null} field */
    _teardownField(field: DateFieldController | null): void;
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
    /** @public @returns {any} */
    get source(): any;
    set source(value: any);
    /** @public @returns {any} */
    get dateState(): any;
    set dateState(value: any);
    /** @public @returns {any} */
    get renderDay(): any;
    set renderDay(value: any);
    /** @public @returns {any} */
    get isDateDisabled(): any;
    set isDateDisabled(value: any);
    _adapter(): {
        locale: string;
        placeholder: string;
        format(value: string): string;
        parse(text: string): string;
    };
    _setupFormValue(): void;
    _syncInputState(): void;
    _syncRangeFields(): void;
    _setRangeAria(): void;
    /** @param {HTMLInputElement} [anchorInput] */
    _build(anchorInput?: HTMLInputElement): void;
    _bind(): void;
    _bindRange(): void;
    /** @param {"" | "start" | "end"} endpoint @param {KeyboardEvent} event */
    _onFieldKeyDown(endpoint: "" | "start" | "end", event: KeyboardEvent): void;
    /** @param {"" | "start" | "end"} endpoint @param {FocusEvent} event */
    _onFieldFocus(endpoint: "" | "start" | "end", event: FocusEvent): void;
    /** Record range-mode grid activation intent (click or keyboard) so a stale,
     * late-confirmed dateactivate can be recognized and dropped. Each new grid
     * activation supersedes every earlier pending one.
     * @param {Event} event */
    _captureGridIntent(event: Event): void;
    /** @param {KeyboardEvent} event */
    _onEscape(event: KeyboardEvent): void;
    _syncCalendarOptions(): void;
    _refreshLocale(): void;
    _refreshButtonLabel(): void;
    _refreshRangeButtonLabel(): void;
    /** @param {string} value */
    _reflectValue(value: string): void;
    /** @param {string} value @param {{emit?:boolean,format?:boolean,reflect?:boolean}} [options] */
    _setValue(value: string, options?: {
        emit?: boolean;
        format?: boolean;
        reflect?: boolean;
    }): void;
    /**
     * Calendar-backed availability gate injected into the field controllers.
     * A cancelled or failed source load confirms nothing: do not fill the
     * submitted ISO field nor treat the date as available.
     * @param {string} date @returns {Promise<{ok: boolean, message?: string}>}
     */
    _confirmDate(date: string): Promise<{
        ok: boolean;
        message?: string;
    }>;
    /** @param {boolean} emit @param {{force?: boolean}} [options] */
    _commitText(emit: boolean, options?: {
        force?: boolean;
    }): Promise<boolean>;
    /** @param {"start" | "end"} which */
    _commitFieldText(which: "start" | "end"): Promise<boolean>;
    /** @param {"start" | "end"} which @param {string} value
     * @param {{emit?:boolean, format?:boolean, user?:boolean}} [options] @returns {boolean} */
    _setBound(which: "start" | "end", value: string, options?: {
        emit?: boolean;
        format?: boolean;
        user?: boolean;
    }): boolean;
    /** Atomic pair update: canonical + visible + hidden before one event.
     * @param {string} start @param {string} end @param {{emit?:boolean, format?:boolean}} [options] */
    _setRange(start: string, end: string, options?: {
        emit?: boolean;
        format?: boolean;
    }): void;
    /** @param {"start" | "end"} which */
    _boundCanonical(which: "start" | "end"): string;
    _emitRangeChange(): void;
    /** Forward only a displayable range to the calendar band. An inverted or
     * start-less business range shows no misleading band. */
    _syncHighlight(): void;
    /**
     * Cross-bound validity: the order error is attributed to the bound that was
     * just modified; the other bound only loses a stale order error, never its
     * independent parse/source validity.
     * @param {"start" | "end"} which
     */
    _revalidateRange(which: "start" | "end"): void;
    _restoreDefault(): void;
    _restoreRangeDefault(): void;
    /** @param {"start" | "end"} which */
    _focusField(which: "start" | "end"): void;
    _focusInput(): void;
    /** @returns {"" | "start" | "end"} */
    _resolveRangeEndpoint(): "" | "start" | "end";
    /** @public */
    validate(): Promise<boolean>;
    /** @public @param {{moveFocus?:boolean}} [options] */
    show(options?: {
        moveFocus?: boolean;
    }): void;
    /** @param {boolean} expanded */
    _setExpanded(expanded: boolean): void;
    /** @public @param {boolean} [restoreFocus] */
    hide(restoreFocus?: boolean): void;
    /** The bound to restore focus to after closing a range popup: the active
     * endpoint first (it moved after the first selection), then the next
     * focusable bound.
     * @returns {"" | "start" | "end"} */
    _restoreFocusEndpoint(): "" | "start" | "end";
}
//# sourceMappingURL=date-picker.d.ts.map