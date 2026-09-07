import { autoUpdate, reposition } from "@lekoala/floating";
import { isDate, monthKey, todayISO } from "./date.js";
import { DateCalendarElement } from "./date-calendar.js";
import { createDateAdapter, formatLongDate, resolveLocale } from "./intl.js";
import { getDefaultMessages } from "./messages.js";

let uid = 0;

export class DatePickerElement extends HTMLElement {
  static observedAttributes = ["value", "locale", "min", "max", "open-on-focus"];

  constructor() {
    super();
    this._id = `date-picker-${++uid}`;
    this._connected = false;
    this._reflecting = false;
    this._value = "";
    this._input = null;
    this._hiddenInput = null;
    this._button = null;
    this._panel = null;
    this._calendar = null;
    this._originalName = "";
    this._originalDescribedBy = "";
    this._formatHint = null;
    this._generatedPlaceholder = false;
    this._controller = null;
    this._attributeObserver = null;
    this._stopTracking = null;
    this._open = false;
    this._suppressFocusOpen = false;
    this._commitId = 0;
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

  connectedCallback() {
    if (this._connected) return;
    const input = this.querySelector(":scope > input:not([type=hidden])");
    if (!(input instanceof HTMLInputElement)) {
      console.warn("<date-picker> expects a direct child text input");
      return;
    }
    this._connected = true;
    this._input = input;
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
    if (this._hiddenInput) this._hiddenInput.defaultValue = this._value;
    if (input.getAttribute("value") == null && input.defaultValue === "") {
      input.defaultValue = input.value;
    }
  }

  disconnectedCallback() {
    this._connected = false;
    this.hide(false);
    this._controller?.abort();
    this._controller = null;
    this._attributeObserver?.disconnect();
    this._attributeObserver = null;
    const hiddenName = this._hiddenInput?.getAttribute("name") || this._originalName;
    if (this._input && hiddenName) this._input.setAttribute("name", hiddenName);
    if (this._input) {
      if (this._originalDescribedBy) this._input.setAttribute("aria-describedby", this._originalDescribedBy);
      else this._input.removeAttribute("aria-describedby");
      this._input.removeAttribute("role");
      this._input.removeAttribute("aria-haspopup");
      this._input.removeAttribute("aria-expanded");
      this._input.removeAttribute("aria-controls");
    }
    this._hiddenInput?.remove();
    this._button?.remove();
    this._panel?.remove();
    this._formatHint?.remove();
    this._hiddenInput = null;
    this._button = null;
    this._panel = null;
    this._calendar = null;
    this._formatHint = null;
  }

  /** @param {string} name @param {string|null} oldValue @param {string|null} newValue */
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._connected || this._reflecting || oldValue === newValue) return;
    if (name === "value") {
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
    return this._input;
  }

  /** @public */
  get calendar() {
    return this._calendar;
  }

  /** @public */
  get value() {
    return this._value;
  }

  set value(value) {
    if (value && !isDate(value)) throw new TypeError(`Invalid date-picker value: ${value}`);
    this._setValue(value || "", { emit: false, format: true });
  }

  /** @public */
  get locale() {
    return resolveLocale(this.getAttribute("locale") || "");
  }

  set locale(value) {
    if (value) this.setAttribute("locale", value);
    else this.removeAttribute("locale");
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
    return createDateAdapter(this.locale);
  }

  _setupFormValue() {
    const input = this._input;
    if (!input) return;
    this._originalName = input.getAttribute("name") || "";
    if (this._originalName) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = this._originalName;
      if (input.hasAttribute("form")) hidden.setAttribute("form", input.getAttribute("form") || "");
      hidden.disabled = input.disabled;
      hidden.value = this._value;
      input.removeAttribute("name");
      input.insertAdjacentElement("afterend", hidden);
      this._hiddenInput = hidden;
    }
    this._attributeObserver = new MutationObserver(() => this._syncInputState());
    this._attributeObserver.observe(input, {
      attributes: true,
      attributeFilter: ["disabled", "readonly", "name", "form"],
    });
  }

  _syncInputState() {
    const input = this._input;
    if (!input) return;
    // The hidden canonical field owns submission: a dynamic input name moves
    // to the hidden field and is stripped from the visible input, so the
    // payload never contains both the localized text and the ISO value.
    const name = input.getAttribute("name") || "";
    if (name) {
      if (!this._hiddenInput) {
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.value = this._value;
        input.insertAdjacentElement("afterend", hidden);
        this._hiddenInput = hidden;
      }
      if (this._hiddenInput) this._hiddenInput.name = name;
      input.removeAttribute("name");
    }
    if (this._hiddenInput) {
      if (input.hasAttribute("form"))
        this._hiddenInput.setAttribute("form", input.getAttribute("form") || "");
      else this._hiddenInput.removeAttribute("form");
      this._hiddenInput.disabled = input.disabled;
    }
    if (this._button) this._button.disabled = input.disabled || input.readOnly;
  }

  _build() {
    const input = this._input;
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

    this._originalDescribedBy = input.getAttribute("aria-describedby") || "";
    const describedBy = [this._originalDescribedBy, hintId].filter(Boolean).join(" ");
    input.setAttribute("aria-describedby", describedBy);
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-haspopup", "dialog");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", panelId);
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
        this._commitId++;
        if (this._hiddenInput) this._hiddenInput.value = "";
        const text = input.value.trim();
        if (!text) {
          input.setCustomValidity("");
          return;
        }
        const canonical = this._value ? this._adapter().format(this._value) : "";
        input.setCustomValidity(text === canonical ? "" : this._messages.invalidDate);
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
        if (event.key === "ArrowDown" || (event.altKey && event.key === "ArrowDown")) {
          event.preventDefault();
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
      },
      { signal },
    );
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
          this._commitId++;
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
    this.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Escape" && this._open) {
          event.preventDefault();
          event.stopPropagation();
          this.hide(true);
        }
      },
      { signal },
    );
  }

  _syncCalendarOptions() {
    const calendar = this._calendar;
    const panel = this._panel;
    if (!calendar) return;
    calendar.locale = this.locale;
    calendar.min = this.min;
    calendar.max = this.max;
    calendar.messages = this._messages;
    calendar.source = this._source;
    calendar.dateState = this._dateState;
    calendar.renderDay = this._renderDay;
    calendar.isDateDisabled = this._isDateDisabled;
    if (this._value) calendar.value = this._value;
    if (panel) panel.setAttribute("aria-label", this._messages.calendar);
  }

  _refreshLocale() {
    const input = this._input;
    const hint = this._formatHint;
    if (!input || !hint) return;
    const adapter = this._adapter();
    hint.textContent = `${this._messages.formatHint}: ${adapter.placeholder}`;
    if (!input.hasAttribute("placeholder") || this._generatedPlaceholder) {
      input.placeholder = adapter.placeholder;
      this._generatedPlaceholder = true;
    }
    if (this._value) input.value = adapter.format(this._value);
    this._refreshButtonLabel();
  }

  _refreshButtonLabel() {
    if (!this._button) return;
    const prefix = this._value ? this._messages.changeDate : this._messages.chooseDate;
    const suffix = this._value ? `, ${formatLongDate(this._value, this.locale)}` : "";
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
    if (this._hiddenInput) this._hiddenInput.value = this._value;
    if (this._input && options.format !== false)
      this._input.value = this._value ? this._adapter().format(this._value) : "";
    if (this._calendar) {
      this._calendar.value = this._value;
      if (this._value) this._calendar.focusedDate = this._value;
    }
    this._input?.setCustomValidity("");
    this._refreshButtonLabel();
    if (options.emit && previous !== this._value) {
      this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: this._value }, bubbles: true }));
      if (this._input) {
        this._input.dispatchEvent(new Event("input", { bubbles: true }));
        this._input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else if (previous !== this._value) {
      this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: this._value }, bubbles: true }));
    }
  }

  _restoreDefault() {
    const input = this._input;
    if (!input) return;
    const text = String(input.defaultValue ?? "").trim();
    const parsed = isDate(text) ? text : this._adapter().parse(text);
    this._setValue(parsed && isDate(parsed) ? parsed : "", { emit: false, format: true });
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

  /** @param {boolean} emit */
  async _commitText(emit) {
    const input = this._input;
    const calendar = this._calendar;
    if (!input || !calendar) return false;
    const commitId = ++this._commitId;
    const text = input.value.trim();
    if (!text) {
      if (commitId !== this._commitId) return false;
      this._setValue("", { emit, format: false });
      input.setCustomValidity("");
      return true;
    }
    const parsed = this._adapter().parse(text);
    if (!parsed) {
      if (commitId !== this._commitId) return false;
      if (this._hiddenInput) this._hiddenInput.value = "";
      input.setCustomValidity(this._messages.invalidDate);
      return false;
    }
    const display = monthKey(parsed);
    if (calendar.display !== display) calendar.display = display;
    await calendar.ensureDate(parsed);
    if (commitId !== this._commitId) return false;
    const state = calendar.getDateState(parsed);
    if (state.disabled) {
      if (this._hiddenInput) this._hiddenInput.value = "";
      input.setCustomValidity(this._messages.unavailableDate);
      return false;
    }
    this._setValue(parsed, { emit, format: true });
    return true;
  }

  /** @public */
  async validate() {
    const input = this._input;
    if (!input) return true;
    if (!input.value.trim()) {
      input.setCustomValidity("");
      return input.checkValidity();
    }
    await this._commitText(false);
    return input.checkValidity();
  }

  /** @public @param {{moveFocus?:boolean}} [options] */
  show(options = {}) {
    const panel = this._panel;
    const calendar = this._calendar;
    const input = this._input;
    const button = this._button;
    if (!panel || !calendar || !input || !button || this._open || input.disabled || input.readOnly) return;
    const target = this._value || this._adapter().parse(input.value) || todayISO();
    calendar.display = monthKey(target);
    calendar.focusedDate = target;
    panel.showPopover();
    this._open = true;
    input.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-expanded", "true");
    const position = () =>
      reposition(this, panel, { placement: "bottom-start", distance: 4, shiftPadding: 8 });
    position();
    this._stopTracking = autoUpdate(this, panel, position);
    if (options.moveFocus !== false) queueMicrotask(() => calendar.focusGrid());
    this.dispatchEvent(new Event("open", { bubbles: true }));
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
    this._input?.setAttribute("aria-expanded", "false");
    this._button?.setAttribute("aria-expanded", "false");
    if (restoreFocus) this._focusInput();
    this.dispatchEvent(new Event("close", { bubbles: true }));
  }
}
