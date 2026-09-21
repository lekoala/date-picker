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
    /** Native time companions, [start, end]. @type {[HTMLInputElement | null, HTMLInputElement | null]} */
    _timeFields: [HTMLInputElement | null, HTMLInputElement | null];
    /** Time inputs currently holding our order error. @type {Set<HTMLInputElement>} */
    _timeOrderOwned: Set<HTMLInputElement>;
    /** @type {"" | "start" | "end"} */
    _lastFocusEndpoint: "" | "start" | "end";
    _rangeCommitId: number;
    /** Grid activation intents, keyed by date: the generation at interaction
     * time (range mode supersession/stale protection) plus the bound a drag
     * drop targets, empty for a normal pick.
     * @type {Map<string, {id: number, endpoint: "" | "start" | "end"}>} */
    _pendingIntents: Map<string, {
        id: number;
        endpoint: "" | "start" | "end";
    }>;
    /** Candidate date currently projected onto the calendar band, if any. */
    _previewDate: string;
    /** Live endpoint drag, or null. @type {{pointerId:number, endpoint:"start"|"end", x:number, y:number, date:string, active:boolean} | null} */
    _drag: {
        pointerId: number;
        endpoint: "start" | "end";
        x: number;
        y: number;
        date: string;
        active: boolean;
    } | null;
    /** A real drag already committed; swallow the click that follows it. */
    _suppressGridClick: boolean;
    /** Overlaid calendar triggers, one per field (single) or per bound (range). @type {{button: HTMLButtonElement, endpoint: "" | "start" | "end"}[]} */
    _buttons: {
        button: HTMLButtonElement;
        endpoint: "" | "start" | "end";
    }[];
    /** Control that opened the popover, so single mode can restore focus to it.
     * @type {HTMLElement | null} */
    _returnFocus: HTMLElement | null;
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
    /** Public picker coordinate-space request. @type {"viewport" | "document"} */
    _coordinateSpace: "viewport" | "document";
    static observedAttributes: string[];
    constructor();
    _rangeMode(): boolean;
    connectedCallback(): void;
    _connectSingle(): void;
    /**
     * Find optional native time companions. They stay fully native (no hidden
     * input, no field controller); the picker only coordinates from/to order.
     * A bad composition never breaks the date picker: warn and leave times alone.
     */
    _discoverTimeFields(): void;
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
    /** @public JS-only coordinate-space policy: "viewport" by default, "document" as an explicit opt-in; a change made while open applies to the next opening only. @returns {"viewport" | "document"} */
    get coordinateSpace(): "viewport" | "document";
    set coordinateSpace(value: "viewport" | "document");
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
    /**
     * Create one calendar trigger. It is a real button overlaid inside the
     * field's own box (see the CSS): the field reserves the room, the trigger
     * stays transparent, and the field's focus ring wraps both.
     * @param {"" | "start" | "end"} endpoint
     * @returns {HTMLButtonElement}
     */
    _createTrigger(endpoint: "" | "start" | "end"): HTMLButtonElement;
    /**
     * Build the popup once and one trigger per field. Each trigger is inserted
     * immediately after its own field so DOM order follows visual/tab order
     * (`date -> its trigger -> next control`). The hidden ISO field may sit
     * between the two; it is not focusable.
     */
    _build(): void;
    _bind(): void;
    _bindRange(): void;
    /**
     * Point the shared calendar at one range bound and invalidate any pending
     * activation, so a late response can never commit on the wrong bound.
     * @param {"start" | "end"} endpoint
     */
    _activateRangeEndpoint(endpoint: "start" | "end"): void;
    /**
     * Range has one trigger per bound. A press on the other bound's trigger is a
     * local switch, not a toggle: it repoints the single open popup instead of
     * closing it. Only a press on the already-active bound toggles shut.
     * @param {"start" | "end"} endpoint
     * @param {MouseEvent} event
     */
    _onRangeTriggerClick(endpoint: "start" | "end", event: MouseEvent): void;
    /**
     * ArrowDown on a trigger opens the popup and drops into the grid, like the
     * field itself (Enter/Space go through the click path). Needed because focus
     * now returns to the trigger that opened the popover.
     * @param {"" | "start" | "end"} endpoint
     * @param {KeyboardEvent} event
     */
    _onTriggerKeyDown(endpoint: "" | "start" | "end", event: KeyboardEvent): void;
    /** @param {"" | "start" | "end"} endpoint @param {KeyboardEvent} event */
    _onFieldKeyDown(endpoint: "" | "start" | "end", event: KeyboardEvent): void;
    /** @param {"" | "start" | "end"} endpoint @param {FocusEvent} event */
    _onFieldFocus(endpoint: "" | "start" | "end", event: FocusEvent): void;
    /** Record range-mode grid activation intent (click or keyboard) so a stale,
     * late-confirmed dateactivate can be recognized and dropped. Each new grid
     * activation supersedes every earlier pending one.
     * @param {Event} event */
    _captureGridIntent(event: Event): void;
    /** Whether one bound can receive a user pick right now.
     * @param {"start" | "end"} bound */
    _boundEditable(bound: "start" | "end"): boolean;
    /**
     * Single write path for a calendar-driven range change. Both fields are
     * synchronized before anything is announced, because one transition can move
     * both bounds at once (`10` then `5` commits `start 10 -> 5` together with
     * `end "" -> 10`); writing bound by bound would expose an intermediate
     * inverted pair. Synthetic `input`/`change` stay on the bounds that moved.
     * @param {import("./date-range.js").RangeTransition} transition
     */
    _applyRangeTransition(transition: import("./date-range.js").RangeTransition): void;
    /**
     * Project a candidate date onto the calendar band. Purely visual: no
     * `rangechange`, no field write, no validation and no source request — the
     * projection reads the month state already loaded, and the real availability
     * check still runs on commit.
     * @param {string} date @param {"" | "start" | "end"} [endpoint]
     */
    _setPreview(date: string, endpoint?: "" | "start" | "end"): void;
    /** Drop the projection and put the committed range back on the band. */
    _clearPreview(): void;
    /** @param {Event} event */
    _onGridDateFocus(event: Event): void;
    /**
     * Hover candidate. `focusedDate` stays the keyboard target only: pointer
     * hover never moves it, it just feeds the same projection.
     * @param {Event} event
     */
    _onGridPointerOver(event: Event): void;
    _onGridPointerLeave(): void;
    /** @param {EventTarget | null} target @returns {string} */
    _cellDate(target: EventTarget | null): string;
    /** @param {number} x @param {number} y @returns {string} */
    _dateAtPoint(x: number, y: number): string;
    /**
     * Arm an endpoint drag. Only a complete, ordered range offers two distinct
     * handles; a one-day range carries both markers on the same cell, and
     * guessing which one the user meant would be worse than not dragging.
     * @param {Event} event
     */
    _onGridPointerDown(event: Event): void;
    /** @param {Event} event */
    _onGridPointerMove(event: Event): void;
    /** @param {Event} event */
    _onGridPointerUp(event: Event): void;
    /** @param {Event} event */
    _onGridPointerCancel(event: Event): void;
    /** @param {number} pointerId */
    _releaseDragCapture(pointerId: number): void;
    /** Expose whether the band currently offers draggable handles, and whether
     * one is being dragged, so the cursor can say so. */
    _syncDragAffordance(): void;
    /** @param {KeyboardEvent} event */
    _onEscape(event: KeyboardEvent): void;
    _syncCalendarOptions(): void;
    _refreshLocale(): void;
    _refreshButtonLabel(): void;
    /** Each bound has its own trigger, so each needs its own accessible name: the
     * bound label is what tells two otherwise identical triggers apart. */
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
    /** Displayable projection of the business range. An inverted or start-less
     * pair shows no misleading band. @returns {{start:string, end:string}} */
    _displayRange(): {
        start: string;
        end: string;
    };
    /** Put the committed range back on the calendar band, dropping any
     * projection currently shown over it. */
    _syncHighlight(): void;
    /**
     * Cross-bound validity: the order error is attributed to the bound that was
     * just modified; the other bound only loses a stale order error, never its
     * independent parse/source validity.
     * @param {"start" | "end"} which
     */
    _revalidateRange(which: "start" | "end"): void;
    /**
     * Single-mode from/to order on the shared date: `start <= end`.
     * The order error is attributed to the bound that was just modified; the
     * other bound only loses a stale order error, never its native validity.
     * Missing, empty or disabled times fall back to no order constraint: times
     * are never implicitly required. Equality stays valid (duration rules are
     * application-owned).
     * @param {"start" | "end"} which
     */
    _revalidateTimeOrder(which: "start" | "end"): void;
    _clearTimeOrderValidity(): void;
    _restoreDefault(): void;
    _restoreRangeDefault(): void;
    /** @param {"start" | "end"} which */
    _focusField(which: "start" | "end"): void;
    /**
     * Restore focus to the control that opened the popover (single mode). focus()
     * must not run synchronously from a keydown handler (Chromium drops focus
     * changes there) and must not re-open the popover under the default
     * open-on-focus. Deferring keeps _suppressFocusOpen active for the call.
     */
    _restoreFocus(): void;
    /** @returns {"" | "start" | "end"} */
    _resolveRangeEndpoint(): "" | "start" | "end";
    /** @public */
    validate(): Promise<boolean>;
    /** @public @param {{moveFocus?:boolean, endpoint?:"start"|"end", returnFocus?:HTMLElement}} [options] */
    show(options?: {
        moveFocus?: boolean;
        endpoint?: "start" | "end";
        returnFocus?: HTMLElement;
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