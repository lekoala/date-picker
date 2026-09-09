import { CalendarModel } from "./calendar-model.js";
import {
  addDays,
  clampDate,
  compareDates,
  getMonthWeeks,
  isDate,
  isoWeekNumber,
  monthKey,
  shiftMonth,
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
import { getDefaultMessages } from "./messages.js";
import { normalizeDateStates } from "./source.js";

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

/** @param {"" | "start" | "in" | "end" | "single"} position */
function rangeAttributes(position) {
  switch (position) {
    case "single":
      return ' data-range-start="true" data-range-end="true"';
    case "start":
      return ' data-range-start="true"';
    case "end":
      return ' data-range-end="true"';
    case "in":
      return ' data-in-range="true"';
    default:
      return "";
  }
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

  constructor() {
    super();
    this._id = `date-calendar-${++uid}`;
    this._model = new CalendarModel();
    this._connected = false;
    this._rendering = false;
    /** @type {DateSource | null} */
    this._source = null;
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
    this._messages = getDefaultMessages();
    this._onClick = this._onClick.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFocusIn = this._onFocusIn.bind(this);
  }

  connectedCallback() {
    if (this._connected) return;
    this._connected = true;
    this.addEventListener("click", this._onClick);
    this.addEventListener("change", this._onChange);
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("focusin", this._onFocusIn);
    this._syncModel();
    this.render();
  }

  disconnectedCallback() {
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
    if (next.start === this._highlightedRange.start && next.end === this._highlightedRange.end) return;
    this._highlightedRange = next;
    if (this._connected) this.render();
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

  /** @public */
  get messages() {
    return this._messages;
  }

  set messages(value) {
    this._messages = { ...getDefaultMessages(), ...(value || {}) };
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
        this._model.setDisplay(attrDisplay);
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
    return clampDate(value, this.min, this.max);
  }

  _weeks(display = this.display) {
    const weeks = getMonthWeeks(display, { firstDay: this.firstDay });
    if (!this.fixedWeeks || weeks.length >= 6) return weeks;
    let cursor = weeks[weeks.length - 1]?.[6] || "";
    while (weeks.length < 6 && cursor) {
      const week = [];
      for (let i = 1; i <= 7; i++) week.push(addDays(cursor, i));
      weeks.push(week);
      cursor = week[6];
    }
    return weeks;
  }

  /** @param {HTMLElement} element @returns {string} */
  _focusTargetKey(element) {
    if (element.matches(".dp-month-select, .dp-year-select, .dp-year-input") && element.id) {
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

  /** @public @param {string} date */
  getDateState(date) {
    const fromSource = this._sourceStates.get(date) || {};
    const local = this._dateState?.(date, { ...fromSource }) || {};
    const state = { ...fromSource, ...local };
    const outsideBounds =
      (this.min && compareDates(date, this.min) < 0) || (this.max && compareDates(date, this.max) > 0);
    const explicitlyEnabled = state.enabled === true;
    // min/max > state.disabled > enabled:true lifts only isDateDisabled().
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
    this._model.setDisplay(display);
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
    return this._setDisplay(shiftMonth(this.display, -1));
  }

  /** @public */
  nextMonth() {
    return this._setDisplay(shiftMonth(this.display, 1));
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

  /** @public */
  focusGrid() {
    const target = this.querySelector(`.dp-day[data-date="${CSS.escape(this.focusedDate)}"]`);
    if (target instanceof HTMLElement) target.focus();
  }

  /** @param {string} date @returns {Promise<boolean>} */
  async _activate(date) {
    // Guarantee remote state before deciding: a date clicked before the
    // source resolves must not be treated as available, and a cancelled or
    // failed load must not authorize it either.
    const confirmed = await this.ensureDate(date);
    const state = this.getDateState(date);
    if (!confirmed || state.disabled) {
      this.dispatchEvent(new CustomEvent("dateinvalid", { detail: { date, state }, bubbles: true }));
      return false;
    }
    const accepted = this.dispatchEvent(
      new CustomEvent("dateactivate", {
        detail: { date, state },
        bubbles: true,
        cancelable: true,
      }),
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
    void this._activate(date);
  }

  /** @param {Event} event */
  _onChange(event) {
    const target = event.target;
    if (target instanceof HTMLSelectElement && target.matches(".dp-month-select")) {
      this._setDisplay(`${this.display.slice(0, 4)}-${target.value}`);
      return;
    }
    if (target instanceof HTMLSelectElement && target.matches(".dp-year-select")) {
      this._setDisplay(`${target.value}-${this.display.slice(5, 7)}`);
      return;
    }
    if (target instanceof HTMLInputElement && target.matches(".dp-year-input")) {
      const year = Number(target.value);
      if (!Number.isInteger(year) || year < 1 || year > 9999) {
        if (this._connected) this.render(false);
        return;
      }
      this._setDisplay(`${String(year).padStart(4, "0")}-${this.display.slice(5, 7)}`);
    }
  }

  /** @param {FocusEvent} event */
  _onFocusIn(event) {
    const target = event.target;
    if (!(target instanceof HTMLTableCellElement) || !target.matches(".dp-day[data-date]")) return;
    const date = target.dataset.date || "";
    if (isDate(date)) this._model.focused = date;
  }

  /** @param {KeyboardEvent} event */
  _onKeyDown(event) {
    const target = event.target;
    if (!(target instanceof HTMLTableCellElement) || !target.matches(".dp-day[data-date]")) return;
    const date = target.dataset.date || this.focusedDate;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void this._activate(date);
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
    const prevDisabled = Boolean(minMonth && shiftMonth(display, -1) < minMonth);
    const nextDisabled = Boolean(maxMonth && shiftMonth(display, 1) > maxMonth);
    const minYearAttr = this.min ? ` min="${Number(this.min.slice(0, 4))}"` : "";
    const maxYearAttr = this.max ? ` max="${Number(this.max.slice(0, 4))}"` : "";
    const showWeeks = this.showWeekNumbers && this.firstDay === 1;
    const weekHeader = showWeeks
      ? `<th scope="col" class="dp-week-heading" abbr="${escapeHtml(this._messages.week)}">#</th>`
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

    const rows = weeks
      .map((week) => {
        const weekNumber = showWeeks
          ? `<th scope="row" class="dp-week-number">${isoWeekNumber(week[0])}</th>`
          : "";
        const cells = week
          .map((date) => {
            const state = this.getDateState(date);
            const outside = monthKey(date) !== display;
            const selected = this.value === date;
            const focused = this.focusedDate === date;
            const isToday = date === today;
            const position = rangePosition(date, this._highlightedRange);
            const rangeLabel = rangeLabelKey(position);
            const description = typeof state.description === "string" ? state.description : "";
            const label = [
              formatLongDate(date, locale),
              description,
              rangeLabel ? this._messages[rangeLabel] : "",
              state.disabled ? this._messages.unavailable : "",
            ]
              .filter(Boolean)
              .join(". ");
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
    const monthControl = `<label class="dp-visually-hidden" for="${this._id}-month">${escapeHtml(this._messages.month)}</label>
          <select id="${this._id}-month" class="dp-month-select" aria-label="${escapeHtml(this._messages.month)}">${monthOptions}</select>`;
    const yearControl = `<label class="dp-visually-hidden" for="${this._id}-year">${escapeHtml(this._messages.year)}</label>
          <input id="${this._id}-year" class="dp-year-input" type="number" inputmode="numeric" value="${displayYear}"${minYearAttr}${maxYearAttr} aria-label="${escapeHtml(this._messages.year)}">`;

    this._rendering = true;
    this.innerHTML = `
      <div class="dp-calendar-shell">
        <div class="dp-calendar-header">
          ${yearFirst ? yearControl : monthControl}
          ${yearFirst ? monthControl : yearControl}
          <button type="button" class="dp-nav dp-prev" data-calendar-action="previous" aria-label="${escapeHtml(this._messages.previousMonth)}"${prevDisabled ? " disabled" : ""}><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m10 4-4 4 4 4"/></svg></button>
          <button type="button" class="dp-nav dp-next" data-calendar-action="next" aria-label="${escapeHtml(this._messages.nextMonth)}"${nextDisabled ? " disabled" : ""}><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 4 4 4-4 4"/></svg></button>
        </div>
        <h2 id="${headingId}" class="dp-calendar-heading dp-visually-hidden" aria-live="polite">${escapeHtml(formatMonthYear(`${display}-15`, locale))}</h2>
        <table id="${gridId}" class="dp-grid" role="grid" aria-labelledby="${headingId}">
          <thead><tr>${weekHeader}${dayHeaders}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    this._rendering = false;

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
        const content = this._renderDay(date, this.getDateState(date));
        if (content instanceof Node) extra.append(content);
        else if (content !== undefined && content !== null) extra.textContent = String(content);
      }
    }

    if (load) void this._loadDisplay(display);
  }
}
