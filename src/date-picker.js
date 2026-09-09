import { autoUpdate, reposition } from "@lekoala/floating";
import { compareDates, isDate, monthKey, todayISO } from "./date.js";
import { DateCalendarElement } from "./date-calendar.js";
import { DateFieldController } from "./date-field.js";
import { DateRangeController, normalizeRange } from "./date-range.js";
import { createDateAdapter, formatLongDate, resolveLocale } from "./intl.js";
import { getDefaultMessages } from "./messages.js";
import { compareTimes, isTime } from "./time.js";

let uid = 0;

export class DatePickerElement extends HTMLElement {
  static observedAttributes = ["value", "locale", "min", "max", "open-on-focus", "month-format"];

  constructor() {
    super();
    this._id = `date-picker-${++uid}`;
    this._connected = false;
    this._reflecting = false;
    this._value = "";
    this._input = null;
    /** @type {DateFieldController | null} */
    this._field = null;
    /** @type {DateFieldController[] | null} */
    this._fields = null;
    /** @type {DateRangeController | null} */
    this._range = null;
    this._orderTags = new Set();
    /** Native time companions, [start, end]. @type {[HTMLInputElement | null, HTMLInputElement | null]} */
    this._timeFields = [null, null];
    /** Time inputs currently holding our order error. @type {Set<HTMLInputElement>} */
    this._timeOrderOwned = new Set();
    /** @type {"" | "start" | "end"} */
    this._lastFocusEndpoint = "";
    this._rangeCommitId = 0;
    /** Map of clicked/keyboard-activated grid dates to the generation at click
     * time (range mode supersession/stale protection). @type {Map<string, number>} */
    this._pendingIntents = new Map();
    this._button = null;
    this._panel = null;
    this._calendar = null;
    this._originalDescribedBy = "";
    this._rangeOriginalDescribedBy = ["", ""];
    this._formatHint = null;
    this._generatedPlaceholder = false;
    this._controller = null;
    this._stopTracking = null;
    this._open = false;
    this._suppressFocusOpen = false;
    this._messages = getDefaultMessages();
    /** @type {any} */
    this._source = null;
    /** @type {any} */
    this._dateState = null;
    /** @type {any} */
    this._renderDay = null;
    /** @type {any} */
    this._isDateDisabled = null;
  }

  _rangeMode() {
    return this.hasAttribute("range") && Boolean(this._range);
  }

  connectedCallback() {
    if (this._connected) return;
    if (this.hasAttribute("range")) {
      this._connectRange();
      return;
    }
    this._connectSingle();
  }

  _connectSingle() {
    const input = this.querySelector(
      ":scope > input:not([type=hidden]):not([type=time]):not([data-time-start]):not([data-time-end])",
    );
    if (!(input instanceof HTMLInputElement)) {
      console.warn("<date-picker> expects a direct child text input");
      return;
    }
    this._connected = true;
    this._input = input;
    this._discoverTimeFields();
    this._field = new DateFieldController(input, { messages: this._messages, locale: this.locale });
    this._field.onAttributesChanged = () => this._syncInputState();
    this._field.confirm = (date) => this._confirmDate(date);
    this._setupFormValue();
    this._build();
    this._syncInputState();
    this._bind();
    this._syncCalendarOptions();

    const adapter = this._adapter();
    const initial =
      this.getAttribute("value") || (isDate(input.value) ? input.value : adapter.parse(input.value));
    if (initial && isDate(initial)) this._setValue(initial, { emit: false, format: true });
    else if (!input.value) this._setValue("", { emit: false, format: false });
    else input.setCustomValidity(this._messages.invalidDate);

    // Native form reset restores control defaultValues, then _restoreDefault()
    // recommits the canonical value from them. Never redefine an author-provided
    // input.defaultValue here: the next reset must use the native default (which
    // the app may change). Only when enhancement itself supplies the initial
    // text (picker value attr, no input value attr) does that text become the
    // default to restore.
    if (this._field.hidden) this._field.hidden.defaultValue = this._value;
    if (input.getAttribute("value") == null && input.defaultValue === "") {
      input.defaultValue = input.value;
    }
  }

  /**
   * Find optional native time companions. They stay fully native (no hidden
   * input, no field controller); the picker only coordinates from/to order.
   * A bad composition never breaks the date picker: warn and leave times alone.
   */
  _discoverTimeFields() {
    this._timeFields = [null, null];
    /** @type {["data-time-start", "data-time-end"]} */
    const markers = ["data-time-start", "data-time-end"];
    for (const [index, marker] of markers.entries()) {
      const matches = this.querySelectorAll(`:scope > input[${marker}]`);
      if (matches.length > 1) {
        console.warn(`<date-picker> expects at most one direct child input[${marker}]; ignoring extras`);
      }
      const candidate = matches[0];
      if (candidate == null) continue;
      if (!(candidate instanceof HTMLInputElement) || candidate.type !== "time") {
        console.warn(`<date-picker> input[${marker}] must be an <input type="time">; ignoring it`);
        continue;
      }
      this._timeFields[index] = candidate;
    }
    if (this.querySelector(":scope > input[type=time]:not([data-time-start]):not([data-time-end])")) {
      console.warn("<date-picker> time inputs need [data-time-start] or [data-time-end]; ignoring it");
    }
  }

  _connectRange() {
    if (this.querySelector(":scope > input[data-time-start], :scope > input[data-time-end]")) {
      console.warn("<date-picker range> time companions are not supported yet; leaving them native");
    }
    const startInput = this.querySelector(":scope > input[data-range-start]");
    const endInput = this.querySelector(":scope > input[data-range-end]");
    if (!(startInput instanceof HTMLInputElement) || !(endInput instanceof HTMLInputElement)) {
      console.warn(
        "<date-picker range> expects direct child inputs marked [data-range-start] and [data-range-end]",
      );
      return;
    }
    this._connected = true;
    this._input = null;
    this._fields = [
      new DateFieldController(startInput, { messages: this._messages, locale: this.locale }),
      new DateFieldController(endInput, { messages: this._messages, locale: this.locale }),
    ];
    this._range = new DateRangeController();
    this._rangeOriginalDescribedBy = [
      startInput.getAttribute("aria-describedby") || "",
      endInput.getAttribute("aria-describedby") || "",
    ];
    for (const field of this._fields) {
      field.onAttributesChanged = () => this._syncRangeFields();
      field.confirm = (date) => this._confirmDate(date);
      field.setupFormValue();
    }
    this._build(endInput);
    this._setRangeAria();
    this._syncRangeFields();
    this._bindRange();
    this._syncCalendarOptions();

    const adapter = this._adapter();
    const initialStart = isDate(startInput.value) ? startInput.value : adapter.parse(startInput.value);
    const initialEnd = isDate(endInput.value) ? endInput.value : adapter.parse(endInput.value);
    this._setRange(initialStart || "", initialEnd || "", { emit: false });
    if (startInput.value.trim() && !isDate(initialStart))
      startInput.setCustomValidity(this._messages.invalidDate);
    if (endInput.value.trim() && !isDate(initialEnd)) endInput.setCustomValidity(this._messages.invalidDate);

    if (this._fields[0].hidden) this._fields[0].hidden.defaultValue = this._range.start;
    if (this._fields[1].hidden) this._fields[1].hidden.defaultValue = this._range.end;
    if (startInput.getAttribute("value") == null && startInput.defaultValue === "") {
      startInput.defaultValue = startInput.value;
    }
    if (endInput.getAttribute("value") == null && endInput.defaultValue === "") {
      endInput.defaultValue = endInput.value;
    }
  }

  disconnectedCallback() {
    this._connected = false;
    this.hide(false);
    this._controller?.abort();
    this._controller = null;
    this._clearTimeOrderValidity();
    this._timeFields = [null, null];
    if (this._rangeMode()) {
      for (const field of this._fields || []) this._teardownField(field);
      this._fields = null;
      this._range = null;
    } else {
      this._teardownField(this._field);
    }
    this._field = null;
    this._button?.remove();
    this._panel?.remove();
    this._formatHint?.remove();
    this._button = null;
    this._panel = null;
    this._calendar = null;
    this._formatHint = null;
  }

  /** @param {DateFieldController | null} field */
  _teardownField(field) {
    if (!field) return;
    const input = field.input;
    const original = this._fields?.includes(field)
      ? this._rangeOriginalDescribedBy[this._fields?.indexOf(field) ?? 0] || ""
      : this._originalDescribedBy;
    field.teardown();
    if (original) input.setAttribute("aria-describedby", original);
    else input.removeAttribute("aria-describedby");
    input.removeAttribute("role");
    input.removeAttribute("aria-haspopup");
    input.removeAttribute("aria-expanded");
    input.removeAttribute("aria-controls");
  }

  /** @param {string} name @param {string|null} oldValue @param {string|null} newValue */
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._connected || this._reflecting || oldValue === newValue) return;
    if (name === "value") {
      if (this._rangeMode()) return;
      if (!newValue || isDate(newValue))
        this._setValue(newValue || "", { emit: false, format: true, reflect: false });
      return;
    }
    if (name === "locale") this._refreshLocale();
    if (name === "open-on-focus") return;
    this._syncCalendarOptions();
    void this.validate();
  }

  /** @public */
  get input() {
    return this._rangeMode() ? undefined : this._input;
  }

  /** @public */
  get calendar() {
    return this._calendar;
  }

  /** @public */
  get value() {
    return this._rangeMode() ? undefined : this._value;
  }

  set value(value) {
    if (this._rangeMode()) {
      throw new TypeError("value is not available in range mode; use range");
    }
    if (value && !isDate(value)) throw new TypeError(`Invalid date-picker value: ${value}`);
    this._setValue(value || "", { emit: false, format: true });
  }

  /** @public */
  get range() {
    return this._rangeMode() && this._range ? { ...this._range.range } : undefined;
  }

  set range(value) {
    if (!this._rangeMode()) throw new TypeError("range is only available on <date-picker range>");
    const { start, end } = normalizeRange(value);
    this._setRange(start, end);
  }

  /** @public */
  get locale() {
    return resolveLocale(this.getAttribute("locale") || "");
  }

  set locale(value) {
    if (value) this.setAttribute("locale", value);
    else this.removeAttribute("locale");
  }

  /** @public Visible month-name style forwarded to the popup calendar (`long` | `short`); anything else falls back to `long`. */
  get monthFormat() {
    return this.getAttribute("month-format") === "short" ? "short" : "long";
  }

  set monthFormat(value) {
    if (value === "short") this.setAttribute("month-format", "short");
    else this.removeAttribute("month-format");
  }

  /** @public */
  get min() {
    const value = this.getAttribute("min") || "";
    return isDate(value) ? value : "";
  }

  set min(value) {
    if (value) this.setAttribute("min", value);
    else this.removeAttribute("min");
  }

  /** @public */
  get max() {
    const value = this.getAttribute("max") || "";
    return isDate(value) ? value : "";
  }

  set max(value) {
    if (value) this.setAttribute("max", value);
    else this.removeAttribute("max");
  }

  /** @public */
  get openOnFocus() {
    return this.getAttribute("open-on-focus") !== "false";
  }

  set openOnFocus(value) {
    if (value === false) this.setAttribute("open-on-focus", "false");
    else this.removeAttribute("open-on-focus");
  }

  /** @public */
  get open() {
    return this._open;
  }

  /** @public */
  get messages() {
    return this._messages;
  }

  set messages(value) {
    this._messages = { ...getDefaultMessages(), ...(value || {}) };
    if (this._calendar) this._calendar.messages = this._messages;
    for (const field of this._fields || []) field.setMessages(this._messages);
    this._field?.setMessages(this._messages);
    this._refreshButtonLabel();
    void this.validate();
  }

  /** @public @returns {any} */
  get source() {
    return this._source;
  }

  set source(value) {
    this._source = value || null;
    if (this._calendar) this._calendar.source = this._source;
    if (this._connected) void this.validate();
  }

  /** @public @returns {any} */
  get dateState() {
    return this._dateState;
  }

  set dateState(value) {
    this._dateState = typeof value === "function" ? value : null;
    if (this._calendar) this._calendar.dateState = this._dateState;
    if (this._connected) void this.validate();
  }

  /** @public @returns {any} */
  get renderDay() {
    return this._renderDay;
  }

  set renderDay(value) {
    this._renderDay = typeof value === "function" ? value : null;
    if (this._calendar) this._calendar.renderDay = this._renderDay;
  }

  /** @public @returns {any} */
  get isDateDisabled() {
    return this._isDateDisabled;
  }

  set isDateDisabled(value) {
    this._isDateDisabled = typeof value === "function" ? value : null;
    if (this._calendar) this._calendar.isDateDisabled = this._isDateDisabled;
    if (this._connected) void this.validate();
  }

  _adapter() {
    return this._field?.adapter ?? this._fields?.[0]?.adapter ?? createDateAdapter(this.locale);
  }

  _setupFormValue() {
    this._field?.setupFormValue();
  }

  _syncInputState() {
    const input = this._input;
    if (!input) return;
    // The hidden canonical field owns submission; dynamic name/form/disabled
    // movement lives in the field controller.
    this._field?.syncInputState();
    if (this._button) this._button.disabled = input.disabled || input.readOnly;
    if (this._open && (input.disabled || input.readOnly)) this.hide(false);
  }

  _syncRangeFields() {
    if (!this._fields) return;
    for (const field of this._fields) field.syncInputState();
    const active = this._range?.activeEndpoint === "end" ? 1 : 0;
    const disabled = this._fields.every((field) => field.input.disabled || field.input.readOnly);
    if (this._button) this._button.disabled = disabled;
    if (this._open && (this._fields[active]?.input.disabled || this._fields[active]?.input.readOnly)) {
      this.hide(false);
    }
  }

  _setRangeAria() {
    if (!this._fields || !this._panel || !this._formatHint) return;
    for (const field of this._fields) {
      const input = field.input;
      const describedBy = [this._rangeOriginalDescribedBy[this._fields.indexOf(field)], this._formatHint.id]
        .filter(Boolean)
        .join(" ");
      input.setAttribute("aria-describedby", describedBy);
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-haspopup", "dialog");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("aria-controls", this._panel.id);
    }
  }

  /** @param {HTMLInputElement} [anchorInput] */
  _build(anchorInput) {
    const input = anchorInput || this._input;
    if (!input) return;
    const panelId = `${this._id}-panel`;
    const hintId = `${this._id}-format`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dp-picker-button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", panelId);
    button.innerHTML =
      '<span aria-hidden="true"><svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="1.75" y="3" width="12.5" height="11" rx="1.75"/><path d="M1.75 6.75h12.5"/><path d="M5.25 1.75v2.5M10.75 1.75v2.5"/></svg></span>';

    const panel = document.createElement("div");
    panel.id = panelId;
    panel.className = "dp-picker-panel";
    panel.setAttribute("popover", "manual");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", this._messages.calendar);

    const calendar = new DateCalendarElement();
    calendar.selection = "none";
    calendar.fixedWeeks = true;
    panel.append(calendar);

    const hint = document.createElement("span");
    hint.id = hintId;
    hint.className = "dp-visually-hidden";

    input.insertAdjacentElement("afterend", button);
    button.insertAdjacentElement("afterend", panel);
    panel.insertAdjacentElement("afterend", hint);

    this._button = button;
    this._panel = panel;
    this._calendar = calendar;
    this._formatHint = hint;

    if (!this._rangeMode()) {
      this._originalDescribedBy = input.getAttribute("aria-describedby") || "";
      const describedBy = [this._originalDescribedBy, hintId].filter(Boolean).join(" ");
      input.setAttribute("aria-describedby", describedBy);
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-haspopup", "dialog");
      input.setAttribute("aria-expanded", "false");
      input.setAttribute("aria-controls", panelId);
    }
    this._refreshLocale();
    this._refreshButtonLabel();
  }

  _bind() {
    const input = this._input;
    const button = this._button;
    const calendar = this._calendar;
    if (!input || !button || !calendar) return;
    const controller = new AbortController();
    this._controller = controller;
    const { signal } = controller;

    input.addEventListener(
      "input",
      () => {
        // Raw text is no longer the validated canonical value: the old ISO
        // must never submit (requestSubmit/FormData can bypass blur/change).
        this._field?.handleInput();
      },
      { signal },
    );
    input.addEventListener("change", () => void this._commitText(false), { signal });
    input.addEventListener("blur", () => void this._commitText(false), { signal });
    input.addEventListener(
      "focus",
      (event) => {
        // Opening on focus never steals focus: the user can start typing
        // immediately (DECISIONS D4). Programmatic focus restores are guarded
        // through _suppressFocusOpen and the relatedTarget containment check.
        if (!this.openOnFocus || this._suppressFocusOpen) return;
        const related = /** @type {FocusEvent} */ (event).relatedTarget;
        if (related instanceof Node && this.contains(related)) return;
        if (!this._open) this.show({ moveFocus: false });
      },
      { signal },
    );
    input.addEventListener(
      "keydown",
      (event) => {
        this._onFieldKeyDown("", event);
      },
      { signal },
    );
    for (const [index, timeInput] of this._timeFields.entries()) {
      if (!timeInput) continue;
      const endpoint = index === 1 ? "end" : "start";
      timeInput.addEventListener("input", () => this._revalidateTimeOrder(endpoint), { signal });
      timeInput.addEventListener("change", () => this._revalidateTimeOrder(endpoint), { signal });
    }
    button.addEventListener(
      "click",
      (event) => {
        if (this._open) {
          // Keyboard activation (detail 0) of an already-open picker moves into
          // the grid instead of toggling it shut. This matters under the default
          // open-on-focus, where the popup is already open when Tab reaches the
          // button; Escape keeps closing it. Defer focus as in the input handler.
          if (event.detail === 0) {
            setTimeout(() => this._calendar?.focusGrid(), 0);
            return;
          }
          this.hide(false);
          return;
        }
        this.show();
      },
      { signal },
    );
    calendar.addEventListener(
      "dateactivate",
      (event) => {
        const custom = /** @type {CustomEvent} */ (event);
        const date = custom.detail?.date;
        if (!isDate(date)) return;
        // The app listener on <date-picker> runs after this during bubbling;
        // defer the commit so preventDefault() is actually respected.
        queueMicrotask(() => {
          if (custom.defaultPrevented || !this._connected) return;
          if (this._input?.disabled || this._input?.readOnly) return;
          this._field?.dirty();
          this._setValue(date, { emit: true, format: true });
          this.hide(false);
          this._focusInput();
        });
      },
      { signal },
    );
    calendar.addEventListener("dateloadend", () => void this.validate(), { signal });
    this.ownerDocument.addEventListener(
      "pointerdown",
      (event) => {
        if (!this._open || event.composedPath().includes(this)) return;
        this.hide(false);
      },
      { capture: true, signal },
    );
    this.ownerDocument.addEventListener(
      "reset",
      (event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement && this._input && form === this._input.form) {
          // The reset event fires before the control values are restored and
          // is cancelable; only resync when the reset actually applies.
          this.hide(false);
          queueMicrotask(() => {
            if (!event.defaultPrevented) this._restoreDefault();
          });
        }
      },
      { capture: true, signal },
    );
    this.addEventListener("keydown", (event) => this._onEscape(event), { signal });
  }

  _bindRange() {
    const button = this._button;
    const calendar = this._calendar;
    if (!this._fields || !button || !calendar) return;
    const controller = new AbortController();
    this._controller = controller;
    const { signal } = controller;

    for (const [index, field] of this._fields.entries()) {
      const endpoint = index === 1 ? "end" : "start";
      field.input.addEventListener("input", () => field.handleInput(), { signal });
      field.input.addEventListener("change", () => void this._commitFieldText(endpoint), { signal });
      field.input.addEventListener("blur", () => void this._commitFieldText(endpoint), { signal });
      field.input.addEventListener(
        "focus",
        (event) => this._onFieldFocus(endpoint, /** @type {FocusEvent} */ (event)),
        { signal },
      );
      field.input.addEventListener("keydown", (event) => this._onFieldKeyDown(endpoint, event), { signal });
    }
    button.addEventListener(
      "click",
      (event) => {
        if (this._open) {
          if (event.detail === 0) {
            setTimeout(() => this._calendar?.focusGrid(), 0);
            return;
          }
          this.hide(false);
          return;
        }
        this.show();
      },
      { signal },
    );
    // Record grid-activation intent synchronously (click or Enter/Space). The
    // picker only commits a dateactivate whose generation still matches, so a
    // response that resolves after the active endpoint changed (or after a
    // newer activation) is dropped without touching either bound.
    calendar.addEventListener("click", (event) => this._captureGridIntent(event), { capture: true, signal });
    calendar.addEventListener("keydown", (event) => this._captureGridIntent(event), {
      capture: true,
      signal,
    });
    calendar.addEventListener(
      "dateactivate",
      (event) => {
        const custom = /** @type {CustomEvent} */ (event);
        const date = custom.detail?.date;
        if (!isDate(date)) return;
        queueMicrotask(() => {
          if (custom.defaultPrevented || !this._connected || !this._range) return;
          const pending = this._pendingIntents.get(date);
          // A response is dropped when the active endpoint changed, the popup
          // closed or a newer activation superseded this one.
          if (pending === undefined || pending !== this._rangeCommitId) return;
          this._pendingIntents.delete(date);
          const result = this._range.activate(date, (which) => {
            const index = which === "end" ? 1 : 0;
            const field = this._fields?.[index];
            return field != null && !field.input.disabled && !field.input.readOnly;
          });
          if (result.status === "refused") {
            this._calendar?.dispatchEvent(
              new CustomEvent("dateinvalid", {
                detail: { date, state: this._calendar.getDateState(date) },
                bubbles: true,
              }),
            );
            return;
          }
          this._setBound(result.endpoint, date, { emit: true, user: true });
          if (result.close || result.status === "complete") {
            this.hide(false);
            this._focusField(result.endpoint);
          }
        });
      },
      { signal },
    );
    calendar.addEventListener("dateloadend", () => void this.validate(), { signal });
    this.ownerDocument.addEventListener(
      "pointerdown",
      (event) => {
        if (!this._open || event.composedPath().includes(this)) return;
        this.hide(false);
      },
      { capture: true, signal },
    );
    this.ownerDocument.addEventListener(
      "reset",
      (event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement && this._fields && form === this._fields[0].input.form) {
          this.hide(false);
          queueMicrotask(() => {
            if (!event.defaultPrevented) this._restoreRangeDefault();
          });
        }
      },
      { capture: true, signal },
    );
    this.addEventListener("keydown", (event) => this._onEscape(event), { signal });
  }

  /** @param {"" | "start" | "end"} endpoint @param {KeyboardEvent} event */
  _onFieldKeyDown(endpoint, event) {
    if (event.key === "ArrowDown" || (event.altKey && event.key === "ArrowDown")) {
      event.preventDefault();
      if (this._rangeMode() && endpoint) {
        this._lastFocusEndpoint = endpoint;
        this._range?.focus(endpoint);
      }
      if (this._open) {
        // Chromium drops script-initiated focus changes made during keydown
        // dispatch; defer to a macrotask so the grid can take keyboard focus.
        setTimeout(() => this._calendar?.focusGrid(), 0);
      } else {
        this.show();
      }
    } else if (event.key === "Escape" && this._open) {
      event.preventDefault();
      this.hide(false);
    }
  }

  /** @param {"" | "start" | "end"} endpoint @param {FocusEvent} event */
  _onFieldFocus(endpoint, event) {
    if (!this._rangeMode() || !endpoint) return;
    const switched = endpoint !== this._range?.activeEndpoint;
    this._lastFocusEndpoint = endpoint;
    this._range?.focus(endpoint);
    if (switched) {
      // A late calendar activation targeting the previous endpoint must not
      // commit after the intent moved to the other bound.
      this._rangeCommitId++;
      this._pendingIntents.clear();
    }
    if (!this.openOnFocus || this._suppressFocusOpen) return;
    const related = event.relatedTarget;
    if (related instanceof Node && this.contains(related)) return;
    if (!this._open) this.show({ moveFocus: false });
  }

  /** Record range-mode grid activation intent (click or keyboard) so a stale,
   * late-confirmed dateactivate can be recognized and dropped. Each new grid
   * activation supersedes every earlier pending one.
   * @param {Event} event */
  _captureGridIntent(event) {
    if (!this._rangeMode() || !this._range) return;
    if (event.type === "keydown") {
      const key = /** @type {KeyboardEvent} */ (event).key;
      if (key !== "Enter" && key !== " ") return;
    }
    if (!(event.target instanceof Element)) return;
    const cell = event.target.closest(".dp-day[data-date]");
    const date = cell?.getAttribute("data-date") || "";
    if (!isDate(date)) return;
    this._pendingIntents.set(date, ++this._rangeCommitId);
  }

  /** @param {KeyboardEvent} event */
  _onEscape(event) {
    if (event.key === "Escape" && this._open) {
      event.preventDefault();
      event.stopPropagation();
      this.hide(true);
    }
  }

  _syncCalendarOptions() {
    const calendar = this._calendar;
    const panel = this._panel;
    if (!calendar) return;
    calendar.locale = this.locale;
    calendar.min = this.min;
    calendar.max = this.max;
    calendar.monthFormat = this.monthFormat;
    calendar.messages = this._messages;
    calendar.source = this._source;
    calendar.dateState = this._dateState;
    calendar.renderDay = this._renderDay;
    calendar.isDateDisabled = this._isDateDisabled;
    if (!this._rangeMode() && this._value) calendar.value = this._value;
    if (panel) panel.setAttribute("aria-label", this._messages.calendar);
  }

  _refreshLocale() {
    const hint = this._formatHint;
    if (!hint) return;
    if (this._rangeMode() && this._fields) {
      this._fields[0].setLocale(this.locale);
      this._fields[1].setLocale(this.locale);
      hint.textContent = `${this._messages.formatHint}: ${this._fields[0].placeholder}`;
      for (const [index, field] of this._fields.entries()) {
        if (!field.input.hasAttribute("placeholder") || this._generatedPlaceholder) {
          field.input.placeholder = field.placeholder;
          this._generatedPlaceholder = true;
        }
        const canonical = index === 1 ? this._range?.end || "" : this._range?.start || "";
        if (canonical) field.input.value = field.format(canonical);
      }
      this._refreshButtonLabel();
      return;
    }
    const field = this._field;
    if (!field) return;
    field.setLocale(this.locale);
    hint.textContent = `${this._messages.formatHint}: ${field.placeholder}`;
    if (!field.input.hasAttribute("placeholder") || this._generatedPlaceholder) {
      field.input.placeholder = field.placeholder;
      this._generatedPlaceholder = true;
    }
    if (this._value) field.input.value = field.format(this._value);
    this._refreshButtonLabel();
  }

  _refreshButtonLabel() {
    if (!this._button) return;
    if (this._rangeMode()) {
      this._refreshRangeButtonLabel();
      return;
    }
    const prefix = this._value ? this._messages.changeDate : this._messages.chooseDate;
    const suffix = this._value ? `, ${formatLongDate(this._value, this.locale)}` : "";
    this._button.setAttribute("aria-label", `${prefix}${suffix}`);
  }

  _refreshRangeButtonLabel() {
    if (!this._button || !this._range) return;
    const { start, end } = this._range;
    const hasRange = Boolean(start && end);
    const prefix = hasRange ? this._messages.changeDate : this._messages.chooseDate;
    const suffix = hasRange
      ? `, ${formatLongDate(start, this.locale)} – ${formatLongDate(end, this.locale)}`
      : "";
    this._button.setAttribute("aria-label", `${prefix}${suffix}`);
  }

  /** @param {string} value */
  _reflectValue(value) {
    this._reflecting = true;
    if (value) this.setAttribute("value", value);
    else this.removeAttribute("value");
    this._reflecting = false;
  }

  /** @param {string} value @param {{emit?:boolean,format?:boolean,reflect?:boolean}} [options] */
  _setValue(value, options = {}) {
    if (value && !isDate(value)) throw new TypeError(`Invalid date-picker value: ${value}`);
    const previous = this._value;
    this._value = value || "";
    if (options.reflect !== false) this._reflectValue(this._value);
    this._field?.setCanonical(this._value, { format: options.format !== false });
    if (this._calendar) {
      this._calendar.value = this._value;
      if (this._value) this._calendar.focusedDate = this._value;
    }
    this._refreshButtonLabel();
    if (previous !== this._value) {
      this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: this._value }, bubbles: true }));
      if (options.emit && this._field) {
        const input = this._field.input;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }

  /**
   * Calendar-backed availability gate injected into the field controllers.
   * A cancelled or failed source load confirms nothing: do not fill the
   * submitted ISO field nor treat the date as available.
   * @param {string} date @returns {Promise<{ok: boolean, message?: string}>}
   */
  async _confirmDate(date) {
    const calendar = this._calendar;
    if (!calendar) return { ok: true };
    const display = monthKey(date);
    if (calendar.display !== display) calendar.display = display;
    const confirmed = await calendar.ensureDate(date);
    const state = calendar.getDateState(date);
    if (!confirmed || state.disabled) return { ok: false, message: this._messages.unavailableDate };
    return { ok: true };
  }

  /** @param {boolean} emit @param {{force?: boolean}} [options] */
  async _commitText(emit, options = {}) {
    const field = this._field;
    if (!field) return false;
    // Blur/change skip untouched text; explicit validation must recheck the
    // current value against the latest constraints regardless of dirtiness.
    if (!options.force && !field.isDirty) return false;
    const result = await field.commit();
    if (result.status === "stale" || result.status === "invalid") return false;
    this._setValue(result.value || "", { emit, format: result.status === "ok" });
    return true;
  }

  /** @param {"start" | "end"} which */
  async _commitFieldText(which) {
    const fields = this._fields;
    if (!fields) return false;
    const index = which === "end" ? 1 : 0;
    const field = fields[index];
    if (!field?.isDirty) return false;
    const result = await field.commit();
    if (result.status === "stale") return false;
    if (result.status === "invalid") {
      this._orderTags.delete(index);
      return false;
    }
    this._setBound(which, result.value || "", { emit: true, user: true, format: result.status === "ok" });
    return true;
  }

  /** @param {"start" | "end"} which @param {string} value
   * @param {{emit?:boolean, format?:boolean, user?:boolean}} [options] @returns {boolean} */
  _setBound(which, value, options = {}) {
    if (!this._range) return false;
    const fields = this._fields;
    if (!fields) return false;
    const index = which === "end" ? 1 : 0;
    const field = fields[index];
    if (!field) return false;
    // User initiated picks must respect disabled/readonly bounds; reset,
    // explicit validation and programmatic assignments keep their own path.
    if (options.user === true && (field.input.disabled || field.input.readOnly)) return false;
    const next = value || "";
    // The range model may already hold the target (a calendar activation moved
    // it), so change detection reads the field canonical, not the model.
    const previous = field.canonical;
    field.setCanonical(next, { format: options.format !== false });
    if (which === "end") this._range.end = next;
    else this._range.start = next;
    const changed = previous !== next;
    if (changed) {
      this._syncHighlight();
      this._refreshRangeButtonLabel();
      this._emitRangeChange();
      if (options.emit) {
        field.input.dispatchEvent(new Event("input", { bubbles: true }));
        field.input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
    this._revalidateRange(which);
    return changed;
  }

  /** Atomic pair update: canonical + visible + hidden before one event.
   * @param {string} start @param {string} end @param {{emit?:boolean, format?:boolean}} [options] */
  _setRange(start, end, options = {}) {
    if (!this._range || !this._fields) return;
    this._range.start = start || "";
    this._range.end = end || "";
    this._fields[0].setCanonical(start || "", { format: options.format !== false });
    this._fields[1].setCanonical(end || "", { format: options.format !== false });
    this._syncHighlight();
    this._refreshRangeButtonLabel();
    this._revalidateRange("start");
    this._revalidateRange("end");
    if (options.emit !== false) this._emitRangeChange();
  }

  /** @param {"start" | "end"} which */
  _boundCanonical(which) {
    return this._range ? (which === "end" ? this._range.end : this._range.start) : "";
  }

  _emitRangeChange() {
    if (!this._range) return;
    this.dispatchEvent(new CustomEvent("rangechange", { detail: { ...this._range.range }, bubbles: true }));
  }

  /** Forward only a displayable range to the calendar band. An inverted or
   * start-less business range shows no misleading band. */
  _syncHighlight() {
    if (!this._calendar || !this._range) return;
    const { start, end } = this._range;
    if (!start) {
      this._calendar.highlightedRange = { start: "", end: "" };
      return;
    }
    if (end && compareDates(end, start) < 0) {
      this._calendar.highlightedRange = { start, end: "" };
    } else {
      this._calendar.highlightedRange = { start, end };
    }
  }

  /**
   * Cross-bound validity: the order error is attributed to the bound that was
   * just modified; the other bound only loses a stale order error, never its
   * independent parse/source validity.
   * @param {"start" | "end"} which
   */
  _revalidateRange(which) {
    if (!this._fields || !this._range) return;
    const { start, end } = this._range;
    const inverted = Boolean(start && end && compareDates(end, start) < 0);
    const bounds = ["start", "end"];
    for (const bound of bounds) {
      const index = bound === "end" ? 1 : 0;
      const input = this._fields[index].input;
      const message = bound === "end" ? this._messages.rangeOrderEnd : this._messages.rangeOrderStart;
      const shouldHaveOrder = inverted && bound === which;
      if (shouldHaveOrder) {
        input.setCustomValidity(message);
        this._orderTags.add(index);
      } else if (this._orderTags.has(index)) {
        input.setCustomValidity("");
        this._orderTags.delete(index);
      }
    }
  }

  /**
   * Single-mode from/to order on the shared date: `start <= end`.
   * The order error is attributed to the bound that was just modified; the
   * other bound only loses a stale order error, never its native validity.
   * Missing, empty or disabled times fall back to no order constraint: times
   * are never implicitly required. Equality stays valid (duration rules are
   * application-owned).
   * @param {"start" | "end"} which
   */
  _revalidateTimeOrder(which) {
    const [startInput, endInput] = this._timeFields;
    /** @type {["start", "end"]} */
    const bounds = ["start", "end"];
    const inputs = [startInput, endInput];
    const startValue = startInput && !startInput.disabled ? startInput.value.trim() : "";
    const endValue = endInput && !endInput.disabled ? endInput.value.trim() : "";
    const inverted =
      Boolean(startInput && endInput && startValue && endValue) &&
      isTime(startValue) &&
      isTime(endValue) &&
      compareTimes(endValue, startValue) < 0;
    for (const [index, bound] of bounds.entries()) {
      const input = inputs[index];
      if (!input) continue;
      const message = bound === "end" ? this._messages.rangeOrderEnd : this._messages.rangeOrderStart;
      const shouldHaveOrder = inverted && bound === which;
      if (shouldHaveOrder) {
        input.setCustomValidity(message);
        this._timeOrderOwned.add(input);
      } else if (this._timeOrderOwned.has(input)) {
        input.setCustomValidity("");
        this._timeOrderOwned.delete(input);
      }
    }
  }

  _clearTimeOrderValidity() {
    for (const input of this._timeOrderOwned) input.setCustomValidity("");
    this._timeOrderOwned.clear();
  }

  _restoreDefault() {
    const field = this._field;
    if (!field) return;
    const value = field.restoreDefault();
    this._setValue(value, { emit: false, format: true });
    if (this._calendar) {
      if (this._value) {
        this._calendar.display = monthKey(this._value);
        this._calendar.focusedDate = this._value;
      } else {
        this._calendar.display = monthKey(todayISO());
        this._calendar.focusedDate = todayISO();
      }
    }
    void this.validate();
  }

  _restoreRangeDefault() {
    if (!this._fields) return;
    const start = this._fields[0].restoreDefault();
    const end = this._fields[1].restoreDefault();
    this._setRange(start, end);
    if (this._calendar) {
      const target = this._range?.start || todayISO();
      this._calendar.display = monthKey(target);
      this._calendar.focusedDate = target;
    }
    void this.validate();
  }

  /** @param {"start" | "end"} which */
  _focusField(which) {
    const index = which === "end" ? 1 : 0;
    const input = this._fields?.[index]?.input;
    if (!input) return;
    this._suppressFocusOpen = true;
    setTimeout(() => {
      input.focus();
      this._suppressFocusOpen = false;
    }, 0);
  }

  _focusInput() {
    // focus() must not run synchronously from a keydown handler (Chromium drops
    // focus changes there) and must not re-open the popover under the default
    // open-on-focus. Deferring keeps _suppressFocusOpen active for the call.
    this._suppressFocusOpen = true;
    setTimeout(() => {
      this._input?.focus();
      this._suppressFocusOpen = false;
    }, 0);
  }

  /** @returns {"" | "start" | "end"} */
  _resolveRangeEndpoint() {
    if (!this._fields) return "";
    const preferred = this._lastFocusEndpoint || "start";
    const preferredIndex = preferred === "end" ? 1 : 0;
    if (!this._fields[preferredIndex].input.disabled && !this._fields[preferredIndex].input.readOnly) {
      return preferred;
    }
    const alternative = preferred === "end" ? "start" : "end";
    const alternativeIndex = alternative === "end" ? 1 : 0;
    if (!this._fields[alternativeIndex].input.disabled && !this._fields[alternativeIndex].input.readOnly) {
      return alternative;
    }
    return "";
  }

  /** @public */
  async validate() {
    if (this._rangeMode()) {
      const fields = this._fields;
      if (!fields) return true;
      // One owner for values: each commit result is applied centrally so the
      // field controller, hidden ISO, range model and events stay coherent.
      // Empty text flows through commit()'s "clear" outcome, not an early exit.
      for (const [index, field] of fields.entries()) {
        const result = await field.commit();
        if (result.status === "ok" || result.status === "clear") {
          const which = index === 1 ? "end" : "start";
          this._setBound(which, result.value || "", { format: result.status === "ok" });
        }
      }
      this._revalidateRange("start");
      this._revalidateRange("end");
      return fields.every((field) => field.input.checkValidity());
    }
    const input = this._field?.input;
    if (!input) return true;
    if (!input.value.trim()) {
      input.setCustomValidity("");
    } else {
      await this._commitText(false, { force: true });
    }
    // Same start-then-end order as the range path, so a from/to inversion
    // ends reported on "end". A programmatic time change resyncs here too.
    this._revalidateTimeOrder("start");
    this._revalidateTimeOrder("end");
    const timesValid = this._timeFields.every((timeInput) => timeInput?.checkValidity() ?? true);
    return input.checkValidity() && timesValid;
  }

  /** @public @param {{moveFocus?:boolean}} [options] */
  show(options = {}) {
    const panel = this._panel;
    const calendar = this._calendar;
    const button = this._button;
    if (!panel || !calendar || !button || this._open) return;
    if (this._rangeMode()) {
      const endpoint = this._resolveRangeEndpoint();
      if (!endpoint) return;
      this._range?.focus(endpoint);
      this._rangeCommitId++;
      this._pendingIntents.clear();
      const target = this._boundCanonical(endpoint) || todayISO();
      calendar.display = monthKey(target);
      calendar.focusedDate = target;
      this._lastFocusEndpoint = endpoint;
    } else {
      const input = this._input;
      if (!input || input.disabled || input.readOnly) return;
      const target = this._value || this._adapter().parse(input.value) || todayISO();
      calendar.display = monthKey(target);
      calendar.focusedDate = target;
    }
    panel.showPopover();
    this._open = true;
    this._setExpanded(true);
    const position = () =>
      reposition(this, panel, { placement: "bottom-start", distance: 4, shiftPadding: 8 });
    position();
    this._stopTracking = autoUpdate(this, panel, position);
    if (options.moveFocus !== false) queueMicrotask(() => calendar.focusGrid());
    this.dispatchEvent(new Event("open", { bubbles: true }));
  }

  /** @param {boolean} expanded */
  _setExpanded(expanded) {
    const value = expanded ? "true" : "false";
    this._input?.setAttribute("aria-expanded", value);
    this._button?.setAttribute("aria-expanded", value);
    for (const field of this._fields || []) field.input.setAttribute("aria-expanded", value);
  }

  /** @public @param {boolean} [restoreFocus] */
  hide(restoreFocus = false) {
    if (!this._panel || !this._open) return;
    this._stopTracking?.();
    this._stopTracking = null;
    try {
      this._panel.hidePopover();
    } catch {
      // Already hidden by the UA.
    }
    this._open = false;
    this._setExpanded(false);
    this._rangeCommitId++;
    this._pendingIntents.clear();
    if (restoreFocus) {
      if (this._rangeMode()) {
        const endpoint = this._restoreFocusEndpoint();
        if (endpoint) this._focusField(endpoint);
      } else {
        this._focusInput();
      }
    }
    this.dispatchEvent(new Event("close", { bubbles: true }));
  }

  /** The bound to restore focus to after closing a range popup: the active
   * endpoint first (it moved after the first selection), then the next
   * focusable bound.
   * @returns {"" | "start" | "end"} */
  _restoreFocusEndpoint() {
    const active = this._range?.activeEndpoint || "";
    if (active) {
      const index = active === "end" ? 1 : 0;
      const field = this._fields?.[index];
      if (field && !field.input.disabled && !field.input.readOnly) return active;
    }
    return this._resolveRangeEndpoint();
  }
}
