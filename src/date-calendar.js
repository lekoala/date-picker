import { activationIntents } from "./activation-intents.js";
import { CalendarModel } from "./calendar-model.js";
import {
  getDefaultControlClasses,
  normalizeControlClasses,
  resolveControlClasses,
  sameControlClasses,
  setDefaultControlClasses,
  subscribeDefaultControlClasses,
  usesDefaultControlClasses,
} from "./control-classes.js";
import {
  addDays,
  clampDate,
  clampDisplayMonth,
  compareDates,
  endOfMonth,
  getMonthWeeks,
  isDate,
  isoWeekNumber,
  monthKey,
  todayISO,
} from "./date.js";
import { normalizeRange, rangePosition } from "./date-range.js";
import {
  formatLongDate,
  formatMonthYear,
  monthNames,
  monthYearOrder,
  resolveLocale,
  weekdayNames,
} from "./intl.js";
import { getDefaultMessages, setDefaultMessages, subscribeDefaultMessages } from "./messages.js";
import { normalizeDateStates } from "./source.js";
import { upgradeProperties } from "./upgrade-properties.js";

let uid = 0;

/** @param {unknown} value */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** @param {string} value */
function parseFirstDay(value) {
  const parsed = Number(value);
  if (parsed === 7) return 0;
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 1;
}

/** @param {string} month */
function yearOf(month) {
  return Number(month.slice(0, 4));
}

/**
 * Step a `YYYY-MM` key by ±1, or `null` when the step leaves the canonical
 * 0001-01..9999-12 window. Pure arithmetic, so an out-of-range intermediate
 * date is never constructed and the calendar edges cannot throw.
 * @param {string} month
 * @param {number} amount
 * @returns {string | null}
 */
function stepMonthKey(month, amount) {
  const [year, index] = month.split("-").map(Number);
  const absolute = year * 12 + (index - 1) + amount;
  const stepYear = Math.floor(absolute / 12);
  const stepMonth = (((absolute % 12) + 12) % 12) + 1;
  if (stepYear < 1 || stepYear > 9999) return null;
  return `${String(stepYear).padStart(4, "0")}-${String(stepMonth).padStart(2, "0")}`;
}

/**
 * Band attributes for one day position. Markup and in-place band updates read
 * the same map, so the two paths cannot disagree about a cell's state.
 * @param {"" | "start" | "in" | "end" | "single"} position
 * @returns {Record<string, boolean>}
 */
function rangeAttributeMap(position) {
  return {
    "data-range-start": position === "start" || position === "single",
    "data-range-end": position === "end" || position === "single",
    "data-in-range": position === "in",
  };
}

/** @param {"" | "start" | "in" | "end" | "single"} position */
function rangeAttributes(position) {
  return Object.entries(rangeAttributeMap(position))
    .filter(([, on]) => on)
    .map(([name]) => ` ${name}="true"`)
    .join("");
}

/** @param {"" | "start" | "in" | "end" | "single"} position */
function rangeLabelKey(position) {
  if (position === "single") return "rangeSingle";
  if (position === "start") return "rangeStart";
  if (position === "end") return "rangeEnd";
  if (position === "in") return "rangeInRange";
  return "";
}

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

export class DateCalendarElement extends HTMLElement {
  static observedAttributes = [
    "value",
    "display",
    "min",
    "max",
    "first-day",
    "locale",
    "fixed-weeks",
    "show-week-numbers",
    "selection",
    "month-format",
  ];

  /** @public @param {Partial<import("./control-classes.js").ControlClasses>} classes */
  static setDefaultControlClasses(classes) {
    setDefaultControlClasses(classes);
  }

  /** @public */
  static getDefaultControlClasses() {
    return getDefaultControlClasses();
  }

  /** @public @param {Partial<typeof import("./messages.js").DEFAULT_MESSAGES>} messages */
  static setDefaultMessages(messages) {
    setDefaultMessages(messages);
  }

  /** @public */
  static getDefaultMessages() {
    return getDefaultMessages();
  }

  constructor() {
    super();
    this._id = `date-calendar-${++uid}`;
    this._model = new CalendarModel();
    this._connected = false;
    this._rendering = false;
    /** @type {DateSource | null} */
    this._source = null;
    /** Intent the host attached to the next activation of `date`.
     * @type {{date: string, intent: unknown} | null} */
    this._hostIntent = null;
    this._sourceStates = new Map();
    this._loadedRanges = new Set();
    this._loadController = null;
    this._loadingKey = "";
    /** @type {Promise<"loaded" | "cancelled" | "failed"> | null} */
    this._loadingPromise = null;
    /** @type {DateStateResolver | null} */
    this._dateState = null;
    /** @type {DayRenderer | null} */
    this._renderDay = null;
    /** @type {DateDisabledPredicate | null} */
    this._isDateDisabled = null;
    /** @type {DateRange} */
    this._highlightedRange = { start: "", end: "" };
    // Bounds and preview flag the cells were last painted with. The preview
    // flag changes the accessible names (a proposal drops the committed
    // range-start/range-end suffix), so a repaint is due when either changes.
    /** @type {DateRange} */
    this._paintedRange = { start: "", end: "" };
    this._paintedPreview = false;
    /** @type {Map<string, DateState>} States of the current rendered grid. */
    this._renderedStates = new Map();
    /** @type {typeof import("./messages.js").DEFAULT_MESSAGES | null} */
    this._messages = null;
    /** @type {Partial<import("./control-classes.js").ControlClasses> | null} */
    this._controlClasses = null;
    /** @type {(() => void) | null} */
    this._stopDefaultMessages = null;
    /** @type {(() => void) | null} */
    this._stopDefaultControlClasses = null;
    this._onClick = this._onClick.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
  }

  connectedCallback() {
    if (this._connected) return;
    upgradeProperties(this, [
      "locale",
      "min",
      "max",
      "firstDay",
      "selection",
      "monthFormat",
      "fixedWeeks",
      "showWeekNumbers",
      "controlClasses",
      "messages",
      "source",
      "dateState",
      "renderDay",
      "isDateDisabled",
      "highlightedRange",
      "value",
      "display",
    ]);
    this._syncModel();
    upgradeProperties(this, ["focusedDate"]);
    this._stopDefaultControlClasses = subscribeDefaultControlClasses(() => {
      if (usesDefaultControlClasses(this._controlClasses)) this.render();
    });
    this._stopDefaultMessages = subscribeDefaultMessages(() => {
      if (this._messages === null) this.render();
    });
    this._connected = true;
    this.addEventListener("click", this._onClick);
    this.addEventListener("change", this._onChange);
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("focusin", this._onFocusIn);
    this.render();
  }

  disconnectedCallback() {
    this._stopDefaultControlClasses?.();
    this._stopDefaultControlClasses = null;
    this._stopDefaultMessages?.();
    this._stopDefaultMessages = null;
    this._connected = false;
    this._loadController?.abort();
    this._loadController = null;
    this._loadingKey = "";
    this._loadingPromise = null;
    this.removeEventListener("click", this._onClick);
    this.removeEventListener("change", this._onChange);
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("focusin", this._onFocusIn);
  }

  attributeChangedCallback() {
    if (!this._connected || this._rendering) return;
    this._syncModel();
    this.render();
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
  get value() {
    return this._model.value;
  }

  set value(value) {
    const next = value || "";
    if (next && !isDate(next)) throw new TypeError(`Invalid calendar value: ${next}`);
    if (next === this._model.value) return;
    this._model.setValue(next);
    this._reflect("value", next);
    if (this._connected) this.render();
  }

  /** @public */
  get display() {
    return this._model.display;
  }

  set display(value) {
    this._setDisplay(value, { emit: false });
  }

  /** @public */
  get focusedDate() {
    return this._model.focused;
  }

  set focusedDate(value) {
    const next = value || "";
    if (next === this._model.focused) return;
    this.focusDate(next, { moveFocus: false });
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
  get firstDay() {
    return parseFirstDay(this.getAttribute("first-day") || "1");
  }

  set firstDay(value) {
    this.setAttribute("first-day", String(value));
  }

  /** @public */
  get selection() {
    return this.getAttribute("selection") === "none" ? "none" : "single";
  }

  set selection(value) {
    this.setAttribute("selection", value === "none" ? "none" : "single");
  }

  /** @public Visible month-name style in the month select (`long` | `short`); anything else falls back to `long`. The accessible grid heading always keeps the long month/year form. */
  get monthFormat() {
    return this.getAttribute("month-format") === "short" ? "short" : "long";
  }

  set monthFormat(value) {
    if (value === "short") this.setAttribute("month-format", "short");
    else this.removeAttribute("month-format");
  }

  /** @public */
  get highlightedRange() {
    return { ...this._highlightedRange };
  }

  set highlightedRange(value) {
    const next = normalizeRange(value);
    const preview = this.hasAttribute("data-range-preview");
    // Repaint when the preview mode changed even if the bounds are identical:
    // entering/leaving a preview rewrites every cell's accessible name.
    if (
      next.start === this._paintedRange.start &&
      next.end === this._paintedRange.end &&
      preview === this._paintedPreview
    )
      return;
    this._highlightedRange = next;
    if (this._connected) this._updateRangeDom();
  }

  /** @public */
  get fixedWeeks() {
    return this.hasAttribute("fixed-weeks");
  }

  set fixedWeeks(value) {
    this.toggleAttribute("fixed-weeks", Boolean(value));
  }

  /** @public */
  get showWeekNumbers() {
    return this.hasAttribute("show-week-numbers");
  }

  set showWeekNumbers(value) {
    this.toggleAttribute("show-week-numbers", Boolean(value));
  }

  /**
   * Author classes for header controls; omitted roles follow current global defaults.
   * @public
   * @returns {import("./control-classes.js").ControlClasses}
   */
  get controlClasses() {
    return resolveControlClasses(this._controlClasses);
  }

  /** @param {Partial<import("./control-classes.js").ControlClasses> | null} value */
  set controlClasses(value) {
    const previous = this.controlClasses;
    this._controlClasses = normalizeControlClasses(value);
    if (sameControlClasses(previous, this.controlClasses)) return;
    if (this._connected) this.render();
  }

  /** @public @returns {typeof import("./messages.js").DEFAULT_MESSAGES} */
  get messages() {
    return this._messages ?? getDefaultMessages();
  }

  /** @param {Partial<typeof import("./messages.js").DEFAULT_MESSAGES> | null} value */
  set messages(value) {
    this._messages = value == null ? null : { ...getDefaultMessages(), ...value };
    if (this._connected) this.render();
  }

  /** @public @returns {DateSource | null} */
  get source() {
    return this._source;
  }

  set source(value) {
    this._source = value || null;
    this.refreshSource();
  }

  /** @public @returns {DateStateResolver | null} */
  get dateState() {
    return this._dateState;
  }

  set dateState(value) {
    this._dateState = typeof value === "function" ? value : null;
    if (this._connected) this.render();
  }

  /** @public @returns {DayRenderer | null} */
  get renderDay() {
    return this._renderDay;
  }

  set renderDay(value) {
    this._renderDay = typeof value === "function" ? value : null;
    if (this._connected) this.render();
  }

  /** @public @returns {DateDisabledPredicate | null} */
  get isDateDisabled() {
    return this._isDateDisabled;
  }

  set isDateDisabled(value) {
    this._isDateDisabled = typeof value === "function" ? value : null;
    if (this._connected) this.render();
  }

  _syncModel() {
    const firstDay = this.firstDay;
    this._model.firstDay = firstDay;
    const attrValue = this.getAttribute("value") || "";
    if (!attrValue || isDate(attrValue)) this._model.value = attrValue;
    const attrDisplay = this.getAttribute("display") || "";
    if (attrDisplay) {
      try {
        this._model.setDisplay(clampDisplayMonth(attrDisplay, firstDay));
      } catch {
        // Invalid author markup falls back to the current model display.
      }
    } else if (this._model.value) {
      this._model.display = monthKey(this._model.value);
      this._model.focused = this._model.value;
    }
    this._model.focused = this._clamp(this._model.focused);
    if (!this.getAttribute("display")) this._model.display = monthKey(this._model.focused);
  }

  /** @param {string} name @param {string} value */
  _reflect(name, value) {
    this._rendering = true;
    if (value) {
      if (this.getAttribute(name) !== value) this.setAttribute(name, value);
    } else if (this.hasAttribute(name)) {
      this.removeAttribute(name);
    }
    this._rendering = false;
  }

  /** @param {string} value */
  _clamp(value) {
    const bounded = clampDate(value, this.min, this.max);
    const month = monthKey(bounded);
    const safeMonth = clampDisplayMonth(month, this.firstDay);
    if (safeMonth === month) return bounded;
    // The renderable window excludes this month (a calendar edge): keep the
    // day-of-month where the target month has it, else fall back to its last
    // day, so the focused date always exists in the rendered grid.
    const day = Number(bounded.slice(8, 10)) || 1;
    const candidate = addDays(`${safeMonth}-01`, day - 1);
    const last = endOfMonth(safeMonth);
    return compareDates(candidate, last) > 0 ? last : candidate;
  }

  _weeks(display = this.display) {
    return getMonthWeeks(clampDisplayMonth(display, this.firstDay), {
      firstDay: this.firstDay,
      fixedWeeks: this.fixedWeeks,
    });
  }

  /** @param {HTMLElement} element @returns {string} */
  _focusTargetKey(element) {
    if (element.matches(".dp-month-select, .dp-year-input") && element.id) {
      return `#${CSS.escape(element.id)}`;
    }
    if (element.matches(".dp-nav[data-calendar-action]")) {
      return `.dp-nav[data-calendar-action="${CSS.escape(element.dataset.calendarAction || "")}"]`;
    }
    if (element.matches(".dp-day[data-date]")) {
      const date = element.getAttribute("data-date") || "";
      if (isDate(date)) return `.dp-day[data-date="${date}"]`;
    }
    return "";
  }

  /** @param {string} [display] */
  _range(display = this.display) {
    const weeks = this._weeks(display);
    const first = weeks[0];
    const last = weeks[weeks.length - 1];
    if (!first || !last) throw new Error("Calendar month produced no weeks");
    return { start: first[0], end: last[6] };
  }

  /** @public @param {string} date @returns {DateState & {disabled: boolean}} */
  getDateState(date) {
    const fromSource = this._sourceStates.get(date) || {};
    const local = this._dateState?.(date, { ...fromSource }) || {};
    const state = { ...fromSource, ...local };
    const outsideBounds =
      (this.min && compareDates(date, this.min) < 0) || (this.max && compareDates(date, this.max) > 0);
    const explicitlyEnabled = state.enabled === true;
    // min/max > resolved state.disabled > isDateDisabled(), unless resolved
    // state.enabled === true lifts only isDateDisabled().
    const disabledByRule = explicitlyEnabled ? false : Boolean(this._isDateDisabled?.(date));
    const disabled = Boolean(outsideBounds) || Boolean(state.disabled) || disabledByRule;
    return { ...state, disabled };
  }

  /** @public */
  async refreshSource() {
    this._loadController?.abort();
    this._loadController = null;
    this._loadingKey = "";
    this._loadingPromise = null;
    this._loadedRanges.clear();
    this._sourceStates.clear();
    if (this._connected) {
      this.render();
      await this._loadDisplay(this.display);
    }
  }

  /** @public Ensure source state exists for the month containing a typed/selected date.
   * @param {string} date @returns {Promise<boolean>} */
  async ensureDate(date) {
    if (!isDate(date) || !this._source) return true;
    return (await this._loadDisplay(monthKey(date), false)) === "loaded";
  }

  /** @param {string} display @param {boolean} [rerender] @returns {Promise<"loaded" | "cancelled" | "failed">} */
  async _loadDisplay(display, rerender = true) {
    if (!this._source) return "loaded";
    const range = this._range(display);
    const key = `${range.start}/${range.end}`;
    if (this._loadedRanges.has(key)) return "loaded";
    if (key === this._loadingKey && this._loadingPromise) return this._loadingPromise;
    this._loadController?.abort();
    const controller = new AbortController();
    this._loadController = controller;
    this._loadingKey = key;
    const source = this._source;
    const promise = (async () => {
      this.toggleAttribute("data-loading", true);
      this.dispatchEvent(new CustomEvent("dateloadstart", { detail: range, bubbles: true }));
      try {
        const loader = typeof source === "function" ? source : source?.load?.bind(source);
        if (!loader) throw new TypeError("Date source must be a function or expose load(range, { signal })");
        const payload = await loader(range, { signal: controller.signal });
        if (controller.signal.aborted) return "cancelled";
        for (const [date, state] of normalizeDateStates(payload)) this._sourceStates.set(date, state);
        this._loadedRanges.add(key);
        this.dispatchEvent(new CustomEvent("dateloadend", { detail: range, bubbles: true }));
        if (rerender && this._connected && monthKey(this.display) === monthKey(display)) this.render(false);
        return "loaded";
      } catch (error) {
        if (controller.signal.aborted) return "cancelled";
        this.dispatchEvent(new CustomEvent("dateloaderror", { detail: { ...range, error }, bubbles: true }));
        return "failed";
      } finally {
        if (this._loadController === controller) {
          this._loadController = null;
          this.removeAttribute("data-loading");
        }
        if (this._loadingKey === key) {
          this._loadingKey = "";
          this._loadingPromise = null;
        }
      }
    })();
    this._loadingPromise = promise;
    return promise;
  }

  /** @param {string} display @param {{emit?:boolean}} [options] */
  _setDisplay(display, options = {}) {
    const previous = this._model.display;
    this._model.setDisplay(clampDisplayMonth(display, this.firstDay));
    this._model.focused = this._clamp(this._model.focused);
    this._model.display = monthKey(this._model.focused);
    this._reflect("display", this._model.display);
    if (this._connected) this.render();
    if (options.emit !== false && previous !== this._model.display) this._emitDisplayChange();
    return this._model.display;
  }

  _emitDisplayChange() {
    const range = this._range();
    this.dispatchEvent(
      new CustomEvent("displaychange", {
        detail: { display: this.display, ...range },
        bubbles: true,
      }),
    );
  }

  /** @public */
  previousMonth() {
    return this._setDisplay(stepMonthKey(this.display, -1) ?? this.display);
  }

  /** @public */
  nextMonth() {
    return this._setDisplay(stepMonthKey(this.display, 1) ?? this.display);
  }

  /** @public @param {string} date @param {{moveFocus?:boolean}} [options] */
  focusDate(date, options = {}) {
    if (!isDate(date)) throw new TypeError(`Invalid date: ${date}`);
    const next = this._clamp(date);
    const previousDisplay = this.display;
    const previousFocused = this._model.focused;
    const moveFocus = options.moveFocus !== false;
    this._model.setFocused(next);
    this._reflect("display", this._model.display);
    if (previousDisplay !== this.display) {
      if (this._connected) this.render();
      this._emitDisplayChange();
    } else if (this._connected && previousFocused !== this._model.focused) {
      // Same month: no full render, just move the roving tabindex.
      this._moveFocusDom(previousFocused, this._model.focused, moveFocus);
    }
    if (moveFocus) queueMicrotask(() => this.focusGrid());
  }

  /** @param {string} previous @param {string} next @param {boolean} [moveFocus] */
  _moveFocusDom(previous, next, moveFocus = true) {
    const prevCell = previous ? this.querySelector(`.dp-day[data-date="${CSS.escape(previous)}"]`) : null;
    const nextCell = this.querySelector(`.dp-day[data-date="${CSS.escape(next)}"]`);
    if (prevCell instanceof HTMLElement) prevCell.tabIndex = -1;
    if (nextCell instanceof HTMLElement) {
      nextCell.tabIndex = 0;
      if (moveFocus) nextCell.focus();
    } else if (moveFocus) {
      this.focusGrid();
    }
  }

  /** Leave exactly one roving tab stop, on `date`'s cell when rendered.
   * @param {string} date */
  _syncRovingDom(date) {
    for (const cell of this.querySelectorAll('.dp-day[tabindex="0"]')) {
      if (cell instanceof HTMLElement && cell.dataset.date !== date) cell.tabIndex = -1;
    }
    const cell = this.querySelector(`.dp-day[data-date="${CSS.escape(date)}"]`);
    if (cell instanceof HTMLElement) cell.tabIndex = 0;
  }

  /** @param {string} previousValue @param {string} nextValue */
  _moveSelectionDom(previousValue, nextValue) {
    if (previousValue) {
      const prev = this.querySelector(`.dp-day[data-date="${CSS.escape(previousValue)}"]`);
      if (prev instanceof HTMLElement) {
        prev.removeAttribute("data-selected");
        prev.removeAttribute("aria-selected");
      }
    }
    if (nextValue) {
      const next = this.querySelector(`.dp-day[data-date="${CSS.escape(nextValue)}"]`);
      if (next instanceof HTMLElement) {
        next.setAttribute("data-selected", "true");
        next.setAttribute("aria-selected", "true");
        return true;
      }
    }
    return false;
  }

  /**
   * Accessible name of one day cell. The band contribution is dropped while a
   * preview is projected onto `highlightedRange`: a proposal must not be
   * announced as a committed range start/end.
   * @param {string} date @param {DateState} state
   * @param {"" | "start" | "in" | "end" | "single"} position
   */
  _dayLabel(date, state, position) {
    const rangeLabel = this.hasAttribute("data-range-preview") ? "" : rangeLabelKey(position);
    const description = typeof state.description === "string" ? state.description : "";
    return [
      formatLongDate(date, this.locale),
      description,
      rangeLabel ? this.messages[rangeLabel] : "",
      state.disabled ? this.messages.unavailable : "",
    ]
      .filter(Boolean)
      .join(". ");
  }

  /**
   * Repaint the range band over the cells already rendered. The band is
   * presentation on top of the same grid, so it must never rebuild it: a full
   * render would drop `renderDay()` nodes and fight the roving focus on every
   * hover of a live range preview.
   */
  _updateRangeDom() {
    const previousRange = this._paintedRange;
    const previousPreview = this._paintedPreview;
    this._paintedRange = { ...this._highlightedRange };
    this._paintedPreview = this.hasAttribute("data-range-preview");
    for (const cell of this.querySelectorAll(".dp-day[data-date]")) {
      if (!(cell instanceof HTMLTableCellElement)) continue;
      const date = cell.dataset.date || "";
      const position = rangePosition(date, this._highlightedRange);
      if (position === rangePosition(date, previousRange) && previousPreview === this._paintedPreview)
        continue;
      for (const [name, on] of Object.entries(rangeAttributeMap(position))) {
        if (on) cell.setAttribute(name, "true");
        else cell.removeAttribute(name);
      }
      // A moving preview changes only the band. Its accessible labels always
      // omit range roles; entering/leaving preview still updates those labels.
      if (!previousPreview || !this._paintedPreview) {
        const state = this._renderedStates.get(date) || {};
        const label = this._dayLabel(date, state, position);
        if (cell.getAttribute("aria-label") !== label) cell.setAttribute("aria-label", label);
      }
    }
  }

  /** @public */
  focusGrid() {
    const target = this.querySelector(`.dp-day[data-date="${CSS.escape(this.focusedDate)}"]`);
    if (target instanceof HTMLElement) target.focus();
  }

  /**
   * Run one explicit activation: availability check, then the cancelable
   * `dateactivate` seam, then selection. Click, keyboard and any other input
   * device share this single path, so an application that cancels
   * `dateactivate` cannot be bypassed by a new interaction.
   * @public
   * @param {string} date @returns {Promise<boolean>}
   */
  async activateDate(date) {
    const hostIntent = this._hostIntent?.date === date ? this._hostIntent.intent : undefined;
    this._hostIntent = null;
    /** @param {Event} event */
    const tagged = (event) => {
      if (hostIntent !== undefined) activationIntents.set(event, hostIntent);
      return event;
    };
    // Guarantee remote state before deciding: a date clicked before the
    // source resolves must not be treated as available, and a cancelled or
    // failed load must not authorize it either.
    const confirmed = await this.ensureDate(date);
    const state = this.getDateState(date);
    if (!confirmed || state.disabled) {
      this.dispatchEvent(tagged(new CustomEvent("dateinvalid", { detail: { date, state }, bubbles: true })));
      return false;
    }
    const accepted = this.dispatchEvent(
      tagged(
        new CustomEvent("dateactivate", {
          detail: { date, state },
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    if (!accepted) return false;
    if (this.selection === "single") {
      const previousValue = this._model.value;
      this._model.setValue(date);
      this._reflect("value", date);
      this.dispatchEvent(new CustomEvent("datechange", { detail: { value: date }, bubbles: true }));
      this.dispatchEvent(new Event("change", { bubbles: true }));
      if (this._connected) {
        if (monthKey(date) === this.display) this._moveSelectionDom(previousValue, date);
        else this.render();
      }
    } else if (this._connected) {
      // selection="none": keep activation observable without touching value.
      if (monthKey(date) !== this.display) this.render();
    }
    return true;
  }

  /** @param {MouseEvent} event */
  _onClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const nav = target.closest("[data-calendar-action]");
    if (nav instanceof HTMLButtonElement) {
      const action = nav.dataset.calendarAction;
      if (action === "previous") this.previousMonth();
      if (action === "next") this.nextMonth();
      return;
    }
    const cell = target.closest(".dp-day[data-date]");
    if (!(cell instanceof HTMLTableCellElement)) return;
    const date = cell.dataset.date || "";
    if (!isDate(date)) return;
    const previousDisplay = this.display;
    this._model.setFocused(this._clamp(date));
    this._reflect("display", this._model.display);
    if (previousDisplay !== this.display) this._emitDisplayChange();
    // Engines that do not focus a clicked cell still need the tab stop moved.
    else this._syncRovingDom(this._model.focused);
    void this.activateDate(date);
  }

  /** @param {Event} event */
  _onChange(event) {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.matches(".dp-month-select")) {
      this._setDisplay(`${this.display.slice(0, 4)}-${target.value}`);
      return;
    }
    if (target instanceof HTMLInputElement && target.matches(".dp-year-input")) {
      const year = Number(target.value);
      // 9999-12 overflows into 10000, but _setDisplay() clamps it to 9999-11.
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        if (this._connected) this.render(false);
        return;
      }
      this._setDisplay(`${String(year).padStart(4, "0")}-${this.display.slice(5, 7)}`);
    }
  }

  /**
   * Real DOM focus is the single source of truth for `datefocus`: the model is
   * synced here and the event is announced from here, so the temporary focus
   * arithmetic in `_onKeyDown` cannot emit phantom events, and setting
   * `focusedDate` without moving focus stays silent.
   * @param {FocusEvent} event
   */
  _onFocusIn(event) {
    const target = event.target;
    if (!(target instanceof HTMLTableCellElement) || !target.matches(".dp-day[data-date]")) return;
    const date = target.dataset.date || "";
    if (!isDate(date)) return;
    this._model.focused = date;
    // A pointer focuses the cell directly; keep exactly one tab stop on it.
    this._syncRovingDom(date);
    this.dispatchEvent(
      new CustomEvent("datefocus", { detail: { date, state: this.getDateState(date) }, bubbles: true }),
    );
  }

  /** @param {KeyboardEvent} event */
  _onKeyDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLTableCellElement) || !target.matches(".dp-day[data-date]")) return;
    const date = target.dataset.date || this.focusedDate;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void this.activateDate(date);
      return;
    }
    // Movement primitives live in CalendarModel; the DOM only syncs render/focus.
    const anchorFocused = this._model.focused;
    const anchorDisplay = this._model.display;
    this._model.firstDay = this.firstDay;
    this._model.setFocused(date, { follow: false });
    if (event.key === "ArrowLeft") this._model.moveFocusDays(-1);
    else if (event.key === "ArrowRight") this._model.moveFocusDays(1);
    else if (event.key === "ArrowUp") this._model.moveFocusDays(-7);
    else if (event.key === "ArrowDown") this._model.moveFocusDays(7);
    else if (event.key === "Home") this._model.focusWeekStart();
    else if (event.key === "End") this._model.focusWeekEnd();
    else if (event.key === "PageUp")
      event.shiftKey ? this._model.moveFocusYears(-1) : this._model.moveFocusMonths(-1);
    else if (event.key === "PageDown")
      event.shiftKey ? this._model.moveFocusYears(1) : this._model.moveFocusMonths(1);
    else return;
    const next = this._model.focused;
    // Restore the pre-navigation state; focusDate() decides follow/render.
    this._model.focused = anchorFocused;
    this._model.display = anchorDisplay;
    if (!next) return;
    event.preventDefault();
    this.focusDate(this._clamp(next));
  }

  /** @public @param {boolean} [load] */
  render(load = true) {
    if (!this._connected) return;
    const locale = this.locale;
    const display = this.display;
    const displayYear = yearOf(display);
    const displayMonth = Number(display.slice(5, 7));
    const names = monthNames(locale, this.monthFormat);
    const weekdayShort = weekdayNames(locale, this.firstDay, "short");
    const weekdayLong = weekdayNames(locale, this.firstDay, "long");
    const weeks = this._weeks();
    const today = todayISO();
    const headingId = `${this._id}-heading`;
    const gridId = `${this._id}-grid`;
    const minMonth = this.min ? monthKey(this.min) : "";
    const maxMonth = this.max ? monthKey(this.max) : "";
    const prevKey = stepMonthKey(display, -1);
    const nextKey = stepMonthKey(display, 1);
    const prevDisabled = Boolean(minMonth && prevKey !== null && prevKey < minMonth);
    const nextDisabled = Boolean(maxMonth && nextKey !== null && nextKey > maxMonth);
    const minYearAttr = ` min="${this.min ? Number(this.min.slice(0, 4)) : 1}"`;
    const maxYearAttr = ` max="${this.max ? Number(this.max.slice(0, 4)) : 9999}"`;
    const showWeeks = this.showWeekNumbers && this.firstDay === 1;
    const weekHeader = showWeeks
      ? `<th scope="col" class="dp-week-heading" abbr="${escapeHtml(this.messages.week)}">#</th>`
      : "";

    const monthOptions = names
      .map((name, index) => {
        const month = index + 1;
        const key = `${String(displayYear).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
        const disabled = (minMonth && key < minMonth) || (maxMonth && key > maxMonth);
        return `<option value="${String(month).padStart(2, "0")}"${month === displayMonth ? " selected" : ""}${disabled ? " disabled" : ""}>${escapeHtml(name)}</option>`;
      })
      .join("");

    const dayHeaders = weekdayShort
      .map(
        (name, index) =>
          `<th scope="col" abbr="${escapeHtml(weekdayLong[index])}">${escapeHtml(name.replace(".", ""))}</th>`,
      )
      .join("");

    this._renderedStates.clear();
    const rows = weeks
      .map((week) => {
        const weekNumber = showWeeks
          ? `<th scope="row" class="dp-week-number">${isoWeekNumber(week[0])}</th>`
          : "";
        const cells = week
          .map((date) => {
            const state = this.getDateState(date);
            this._renderedStates.set(date, state);
            const outside = monthKey(date) !== display;
            const selected = this.value === date;
            const focused = this.focusedDate === date;
            const isToday = date === today;
            const position = rangePosition(date, this._highlightedRange);
            const label = this._dayLabel(date, state, position);
            return `<td class="dp-day" data-date="${date}"${outside ? ' data-outside-month="true"' : ""}${isToday ? ' data-today="true" aria-current="date"' : ""}${selected ? ' data-selected="true" aria-selected="true"' : ""}${rangeAttributes(position)}${state.disabled ? ' data-disabled="true" aria-disabled="true"' : ""} tabindex="${focused ? "0" : "-1"}" aria-label="${escapeHtml(label)}"><span class="dp-day-number" aria-hidden="true">${Number(date.slice(8, 10))}</span><span class="dp-day-extra" aria-hidden="true"></span></td>`;
          })
          .join("");
        return `<tr>${weekNumber}${cells}</tr>`;
      })
      .join("");

    const focusedElement = document.activeElement;
    const focusKey =
      focusedElement instanceof HTMLElement && this.contains(focusedElement)
        ? this._focusTargetKey(focusedElement)
        : "";

    // Visible month/year controls follow the locale order (Intl-derived, never
    // direction-derived); the flexible header track stays under the month
    // select via `data-year-first`.
    const yearFirst = monthYearOrder(locale)[0] === "year";
    this.toggleAttribute("data-year-first", yearFirst);
    const classes = this.controlClasses;
    const monthClass = escapeHtml(classes.month || "dp-skin");
    const yearClass = escapeHtml(classes.year || "dp-skin");
    const navClass = escapeHtml(classes.nav || "dp-skin");
    const monthControl = `<label class="dp-visually-hidden" for="${this._id}-month">${escapeHtml(this.messages.month)}</label>
          <select id="${this._id}-month" class="dp-month-select ${monthClass}" aria-label="${escapeHtml(this.messages.month)}">${monthOptions}</select>`;
    const yearControl = `<label class="dp-visually-hidden" for="${this._id}-year">${escapeHtml(this.messages.year)}</label>
          <input id="${this._id}-year" class="dp-year-input ${yearClass}" type="number" inputmode="numeric" value="${displayYear}"${minYearAttr}${maxYearAttr} aria-label="${escapeHtml(this.messages.year)}">`;

    this._rendering = true;
    this.innerHTML = `
      <div class="dp-calendar-shell">
        <div class="dp-calendar-header">
          ${yearFirst ? yearControl : monthControl}
          ${yearFirst ? monthControl : yearControl}
          <button type="button" class="dp-nav dp-prev ${navClass}" data-calendar-action="previous" aria-label="${escapeHtml(this.messages.previousMonth)}"${prevDisabled ? " disabled" : ""}><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4-4 4 4"/></svg></button>
          <button type="button" class="dp-nav dp-next ${navClass}" data-calendar-action="next" aria-label="${escapeHtml(this.messages.nextMonth)}"${nextDisabled ? " disabled" : ""}><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg></button>
        </div>
        <h2 id="${headingId}" class="dp-calendar-heading dp-visually-hidden" aria-live="polite">${escapeHtml(formatMonthYear(`${display}-15`, locale))}</h2>
        <table id="${gridId}" class="dp-grid" role="grid" aria-labelledby="${headingId}">
          <thead><tr>${weekHeader}${dayHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    this._rendering = false;
    this._paintedRange = { ...this._highlightedRange };
    this._paintedPreview = this.hasAttribute("data-range-preview");

    if (focusKey) {
      queueMicrotask(() => {
        let selector = focusKey;
        // A day-cell key goes stale across display changes: the old date can
        // reappear as outside-month padding in the new month (fixed-weeks or
        // overlapping edge weeks). Restoring it would yank keyboard focus back
        // onto the date the user just navigated away from, so retarget day
        // cells to the current keyboard position. Controls keep exact restore.
        if (selector.startsWith(".dp-day[data-date=")) {
          selector = `.dp-day[data-date="${CSS.escape(this._model.focused)}"]`;
        }
        const target = this.querySelector(selector);
        if (target instanceof HTMLElement) target.focus();
      });
    }

    if (this._renderDay) {
      for (const cell of this.querySelectorAll(".dp-day[data-date]")) {
        if (!(cell instanceof HTMLTableCellElement)) continue;
        const date = cell.dataset.date || "";
        const extra = cell.querySelector(".dp-day-extra");
        if (!(extra instanceof HTMLElement)) continue;
        const content = this._renderDay(date, this._renderedStates.get(date) || {});
        if (content instanceof Node) extra.append(content);
        else if (content !== undefined && content !== null) extra.textContent = String(content);
      }
    }

    if (load) void this._loadDisplay(display);
  }
}
