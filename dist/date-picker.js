/*** @lekoala/date-picker v0.1.1 - https://github.com/lekoala/date-picker ***/
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };

  // src/define.js
  var exports_define = {};
  __export(exports_define, {
    defineDatePicker: () => defineDatePicker
  });

  // src/date.js
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  var MONTH_RE = /^(\d{4})-(\d{2})$/;
  function isLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }
  function daysInMonth(year, month) {
    if (month === 2)
      return isLeapYear(year) ? 29 : 28;
    return [4, 6, 9, 11].includes(month) ? 30 : 31;
  }
  function parseDate(value) {
    const match = DATE_RE.exec(String(value || ""));
    if (!match)
      return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (year < 1 || year > 9999 || month < 1 || month > 12)
      return null;
    if (day < 1 || day > daysInMonth(year, month))
      return null;
    return { year, month, day };
  }
  function isDate(value) {
    return parseDate(value) !== null;
  }
  function monthKey(value) {
    const text = String(value || "");
    const monthMatch = MONTH_RE.exec(text);
    if (monthMatch) {
      const month = Number(monthMatch[2]);
      if (month >= 1 && month <= 12)
        return `${monthMatch[1]}-${String(month).padStart(2, "0")}`;
    }
    const parsed = parseDate(text);
    if (!parsed)
      throw new TypeError(`Invalid civil date/month: ${value}`);
    return `${String(parsed.year).padStart(4, "0")}-${String(parsed.month).padStart(2, "0")}`;
  }
  function toISODate(year, month, day) {
    const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (!isDate(value))
      throw new TypeError(`Invalid civil date: ${value}`);
    return value;
  }
  function toUTCDate(parts) {
    const date = new Date(0);
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    return date;
  }
  function fromUTCDate(date) {
    return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  }
  function toIntlDate(value) {
    const parsed = parseDate(value);
    if (!parsed)
      throw new TypeError(`Invalid civil date: ${value}`);
    return toUTCDate(parsed);
  }
  function compareDates(a, b) {
    if (!isDate(a) || !isDate(b))
      throw new TypeError("compareDates() expects YYYY-MM-DD values");
    return a === b ? 0 : a < b ? -1 : 1;
  }
  function addDays(value, amount) {
    const parsed = parseDate(value);
    if (!parsed || !Number.isInteger(amount))
      throw new TypeError("addDays() expects a date and integer amount");
    const date = toUTCDate(parsed);
    date.setUTCDate(date.getUTCDate() + amount);
    return fromUTCDate(date);
  }
  function addMonths(value, amount) {
    const parsed = parseDate(value);
    if (!parsed || !Number.isInteger(amount))
      throw new TypeError("addMonths() expects a date and integer amount");
    const absoluteMonth = parsed.year * 12 + (parsed.month - 1) + amount;
    const year = Math.floor(absoluteMonth / 12);
    const monthIndex = (absoluteMonth % 12 + 12) % 12;
    const month = monthIndex + 1;
    const day = Math.min(parsed.day, daysInMonth(year, month));
    return toISODate(year, month, day);
  }
  function addYears(value, amount) {
    const parsed = parseDate(value);
    if (!parsed || !Number.isInteger(amount))
      throw new TypeError("addYears() expects a date and integer amount");
    const year = parsed.year + amount;
    const day = Math.min(parsed.day, daysInMonth(year, parsed.month));
    return toISODate(year, parsed.month, day);
  }
  function shiftMonth(month, amount) {
    const start = `${monthKey(month)}-01`;
    return monthKey(addMonths(start, amount));
  }
  function startOfMonth(value) {
    return `${monthKey(value)}-01`;
  }
  function endOfMonth(value) {
    const parsed = parseDate(`${monthKey(value)}-01`);
    if (!parsed)
      throw new TypeError(`Invalid month: ${value}`);
    return toISODate(parsed.year, parsed.month, daysInMonth(parsed.year, parsed.month));
  }
  function dayOfWeek(value) {
    const parsed = parseDate(value);
    if (!parsed)
      throw new TypeError(`Invalid civil date: ${value}`);
    return toUTCDate(parsed).getUTCDay();
  }
  function normalizeFirstDay(firstDay) {
    if (firstDay === 7)
      return 0;
    if (!Number.isInteger(firstDay) || firstDay < 0 || firstDay > 6)
      throw new RangeError("firstDay must be 0..6 (Sunday=0, 7 accepted as Sunday alias)");
    return firstDay;
  }
  function startOfWeek(value, firstDay = 1) {
    const offset = (dayOfWeek(value) - normalizeFirstDay(firstDay) + 7) % 7;
    return addDays(value, -offset);
  }
  function endOfWeek(value, firstDay = 1) {
    return addDays(startOfWeek(value, firstDay), 6);
  }
  function getMonthWeeks(value, options = {}) {
    const firstDay = options.firstDay ?? 1;
    const start = startOfWeek(startOfMonth(value), firstDay);
    const end = endOfWeek(endOfMonth(value), firstDay);
    const weeks = [];
    let cursor = start;
    while (compareDates(cursor, end) <= 0) {
      const week = [];
      for (let i = 0;i < 7; i++)
        week.push(addDays(cursor, i));
      weeks.push(week);
      cursor = addDays(cursor, 7);
    }
    return weeks;
  }
  function clampDate(value, min = "", max = "") {
    if (!isDate(value))
      throw new TypeError(`Invalid civil date: ${value}`);
    if (min && compareDates(value, min) < 0)
      return min;
    if (max && compareDates(value, max) > 0)
      return max;
    return value;
  }
  function todayISO() {
    const now = new Date;
    return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  function isoWeekNumber(value) {
    const parsed = parseDate(value);
    if (!parsed)
      throw new TypeError(`Invalid civil date: ${value}`);
    const date = toUTCDate(parsed);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(0);
    yearStart.setUTCHours(12, 0, 0, 0);
    yearStart.setUTCFullYear(date.getUTCFullYear(), 0, 1);
    return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // src/calendar-model.js
  class CalendarModel {
    constructor(options = {}) {
      const today = todayISO();
      this.firstDay = normalizeFirstDay(options.firstDay ?? 1);
      this.value = options.value && isDate(options.value) ? options.value : "";
      this.focused = options.focused && isDate(options.focused) ? options.focused : this.value || today;
      this.display = options.display ? monthKey(options.display) : monthKey(this.focused);
    }
    setValue(value) {
      if (value && !isDate(value))
        throw new TypeError(`Invalid value: ${value}`);
      this.value = value || "";
      return this.value;
    }
    setDisplay(value) {
      const target = monthKey(value);
      const day = Number(this.focused.slice(8, 10)) || 1;
      const next = addMonths(`${target}-01`, 0);
      const candidate = addDays(next, Math.max(0, day - 1));
      this.focused = monthKey(candidate) === target ? candidate : addDays(`${shiftMonth(target, 1)}-01`, -1);
      this.display = target;
      return this.display;
    }
    setFocused(value, options = {}) {
      if (!isDate(value))
        throw new TypeError(`Invalid focused date: ${value}`);
      this.focused = value;
      if (options.follow !== false)
        this.display = monthKey(value);
      return this.focused;
    }
    moveFocusDays(amount) {
      return this.setFocused(addDays(this.focused, amount));
    }
    moveFocusMonths(amount) {
      return this.setFocused(addMonths(this.focused, amount));
    }
    moveFocusYears(amount) {
      return this.setFocused(addYears(this.focused, amount));
    }
    focusWeekStart() {
      return this.setFocused(startOfWeek(this.focused, this.firstDay));
    }
    focusWeekEnd() {
      return this.setFocused(endOfWeek(this.focused, this.firstDay));
    }
    navigateMonth(amount) {
      const target = shiftMonth(this.display, amount);
      this.setDisplay(target);
      return this.display;
    }
  }

  // src/date-range.js
  function normalizeRange(range) {
    if (range == null)
      return { start: "", end: "" };
    if (typeof range !== "object")
      throw new TypeError("highlightedRange expects { start, end }");
    const { start = "", end = "" } = range;
    if (start && !isDate(start))
      throw new TypeError(`Invalid range start: ${start}`);
    if (end && !isDate(end))
      throw new TypeError(`Invalid range end: ${end}`);
    if (!start && end)
      throw new TypeError("highlightedRange cannot define an end without a start");
    if (start && end && compareDates(end, start) < 0)
      throw new TypeError("highlightedRange must be ordered; start must be on or before end");
    return { start, end };
  }
  function rangePosition(date, range) {
    if (!range || !isDate(date))
      return "";
    const { start, end } = range;
    if (!start || !isDate(start))
      return "";
    if (start === date)
      return end ? end === date ? "single" : "start" : "start";
    if (end && end === date)
      return "end";
    if (end && compareDates(date, start) >= 0 && compareDates(date, end) <= 0)
      return "in";
    return "";
  }

  class DateRangeController {
    constructor() {
      this.activeEndpoint = "";
      this.start = "";
      this.end = "";
    }
    get range() {
      return { start: this.start, end: this.end };
    }
    get complete() {
      return Boolean(this.start && this.end && compareDates(this.end, this.start) >= 0);
    }
    focus(endpoint) {
      this.activeEndpoint = endpoint;
    }
    activate(date, editable = () => true) {
      if (!isDate(date))
        throw new TypeError(`Invalid range activation: ${date}`);
      if (this.complete && (compareDates(date, this.start) < 0 || compareDates(date, this.end) > 0)) {
        const endpoint = compareDates(date, this.start) < 0 ? "start" : "end";
        if (!editable(endpoint))
          return { status: "refused", endpoint };
        this[endpoint] = date;
        this.activeEndpoint = endpoint;
        return { status: "complete", endpoint };
      }
      if (this.activeEndpoint === "end") {
        if (this.start && compareDates(date, this.start) < 0) {
          return { status: "refused", endpoint: "end" };
        }
        if (!editable("end"))
          return { status: "refused", endpoint: "end" };
        this.end = date;
        return { status: this.start ? "complete" : "pending", endpoint: "end" };
      }
      if (!editable("start"))
        return { status: "refused", endpoint: "start" };
      this.start = date;
      if (!editable("end")) {
        return { status: "pending", endpoint: "start", close: true };
      }
      this.activeEndpoint = "end";
      return { status: "pending", endpoint: "start" };
    }
  }

  // src/intl.js
  var BIDI = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g;
  function resolveLocale(locale = "") {
    if (locale)
      return locale;
    if (typeof document !== "undefined" && document.documentElement.lang)
      return document.documentElement.lang;
    if (typeof navigator !== "undefined" && navigator.language)
      return navigator.language;
    return "en-US";
  }
  function digitMap(locale) {
    const formatter = new Intl.NumberFormat(locale, { useGrouping: false });
    const map = new Map;
    for (let i = 0;i <= 9; i++)
      map.set(formatter.format(i), String(i));
    return map;
  }
  function normalizeDigits(text, locale) {
    let result = String(text || "").replace(BIDI, "").trim();
    for (const [local, ascii] of digitMap(locale))
      result = result.split(local).join(ascii);
    return result;
  }
  function formatLongDate(value, locale = "") {
    const resolved = resolveLocale(locale);
    return new Intl.DateTimeFormat(resolved, {
      calendar: "gregory",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    }).format(toIntlDate(value));
  }
  function formatMonthYear(value, locale = "") {
    const resolved = resolveLocale(locale);
    return new Intl.DateTimeFormat(resolved, {
      calendar: "gregory",
      year: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(toIntlDate(`${value.slice(0, 7)}-15`));
  }
  function monthYearOrder(locale = "") {
    const resolved = resolveLocale(locale);
    try {
      const parts = new Intl.DateTimeFormat(resolved, {
        calendar: "gregory",
        year: "numeric",
        month: "long",
        timeZone: "UTC"
      }).formatToParts(toIntlDate("2026-09-15"));
      let monthIndex = -1;
      let yearIndex = -1;
      parts.forEach((part, index) => {
        const type = part.type;
        if (type === "month") {
          if (monthIndex < 0)
            monthIndex = index;
        } else if (type === "year" || type === "relatedYear" || type === "yearName") {
          if (yearIndex < 0)
            yearIndex = index;
        }
      });
      if (monthIndex >= 0 && yearIndex >= 0)
        return yearIndex < monthIndex ? ["year", "month"] : ["month", "year"];
    } catch {}
    return ["month", "year"];
  }
  function monthNames(locale = "", style = "long") {
    const resolved = resolveLocale(locale);
    const formatter = new Intl.DateTimeFormat(resolved, { calendar: "gregory", month: style, timeZone: "UTC" });
    return Array.from({ length: 12 }, (_, index) => formatter.format(toIntlDate(`2026-${String(index + 1).padStart(2, "0")}-15`)));
  }
  function weekdayNames(locale = "", firstDay = 1, style = "short") {
    const resolved = resolveLocale(locale);
    const formatter = new Intl.DateTimeFormat(resolved, {
      calendar: "gregory",
      weekday: style,
      timeZone: "UTC"
    });
    const normalized = normalizeFirstDay(firstDay);
    const sunday = toIntlDate("2026-01-04");
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sunday);
      date.setUTCDate(sunday.getUTCDate() + (normalized + index) % 7);
      return formatter.format(date);
    });
  }
  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function createDateAdapter(locale = "") {
    const resolved = resolveLocale(locale);
    const formatter = new Intl.DateTimeFormat(resolved, {
      calendar: "gregory",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC"
    });
    const sample = toIntlDate("2006-11-22");
    const parts = formatter.formatToParts(sample).filter((part) => part.type !== "literal" || part.value);
    const order = parts.filter((part) => ["day", "month", "year"].includes(part.type)).map((part) => part.type);
    const placeholder = parts.map((part) => {
      if (part.type === "day")
        return "DD";
      if (part.type === "month")
        return "MM";
      if (part.type === "year")
        return "YYYY";
      return part.value.replace(BIDI, "");
    }).join("");
    const pattern = parts.map((part) => {
      if (part.type === "day" || part.type === "month")
        return "(\\d{1,2})";
      if (part.type === "year")
        return "(\\d{4})";
      const literal = normalizeDigits(part.value, resolved).replace(/\s+/g, " ");
      return escapeRegExp(literal).replace(/\\ /g, "\\s*");
    }).join("");
    const regex = new RegExp(`^\\s*${pattern}\\s*$`);
    return {
      locale: resolved,
      placeholder,
      format(value) {
        if (!isDate(value))
          return "";
        return formatter.format(toIntlDate(value));
      },
      parse(text) {
        const normalized = normalizeDigits(text, resolved);
        if (isDate(normalized))
          return normalized;
        const match = regex.exec(normalized);
        if (!match)
          return "";
        const values = {};
        order.forEach((type, index) => {
          values[type] = Number(match[index + 1]);
        });
        if (!values.year || !values.month || !values.day)
          return "";
        try {
          return toISODate(values.year, values.month, values.day);
        } catch {
          return "";
        }
      }
    };
  }

  // src/messages.js
  var DEFAULT_MESSAGES = {
    chooseDate: "Choose date",
    changeDate: "Change date",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    month: "Month",
    year: "Year",
    calendar: "Choose a date",
    unavailable: "Unavailable",
    invalidDate: "Enter a valid date",
    unavailableDate: "This date is unavailable",
    formatHint: "Format",
    week: "Week",
    rangeStart: "Range start",
    rangeInRange: "Inside range",
    rangeEnd: "Range end",
    rangeSingle: "Range of one day",
    rangeOrderStart: "Start must be on or before end",
    rangeOrderEnd: "End must be on or after start"
  };
  var defaults = { ...DEFAULT_MESSAGES };
  function getDefaultMessages() {
    return { ...defaults };
  }

  // src/source.js
  function normalizeDateStates(payload) {
    const raw = payload && typeof payload === "object" && !Array.isArray(payload) && "dates" in payload ? payload.dates : payload;
    const map = new Map;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (!item || typeof item !== "object" || !("date" in item))
          continue;
        const { date, ...state } = item;
        map.set(String(date), state);
      }
      return map;
    }
    if (raw && typeof raw === "object") {
      for (const [date, state] of Object.entries(raw)) {
        map.set(date, state && typeof state === "object" ? state : {});
      }
    }
    return map;
  }

  // src/date-calendar.js
  var uid = 0;
  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
  function parseFirstDay(value) {
    const parsed = Number(value);
    if (parsed === 7)
      return 0;
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 6 ? parsed : 1;
  }
  function yearOf(month) {
    return Number(month.slice(0, 4));
  }
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
  function rangeLabelKey(position) {
    if (position === "single")
      return "rangeSingle";
    if (position === "start")
      return "rangeStart";
    if (position === "end")
      return "rangeEnd";
    if (position === "in")
      return "rangeInRange";
    return "";
  }

  class DateCalendarElement extends HTMLElement {
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
      "month-format"
    ];
    constructor() {
      super();
      this._id = `date-calendar-${++uid}`;
      this._model = new CalendarModel;
      this._connected = false;
      this._rendering = false;
      this._source = null;
      this._sourceStates = new Map;
      this._loadedRanges = new Set;
      this._loadController = null;
      this._loadingKey = "";
      this._loadingPromise = null;
      this._dateState = null;
      this._renderDay = null;
      this._isDateDisabled = null;
      this._highlightedRange = { start: "", end: "" };
      this._messages = getDefaultMessages();
      this._onClick = this._onClick.bind(this);
      this._onChange = this._onChange.bind(this);
      this._onKeyDown = this._onKeyDown.bind(this);
      this._onFocusIn = this._onFocusIn.bind(this);
    }
    connectedCallback() {
      if (this._connected)
        return;
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
      if (!this._connected || this._rendering)
        return;
      this._syncModel();
      this.render();
    }
    get locale() {
      return resolveLocale(this.getAttribute("locale") || "");
    }
    set locale(value) {
      if (value)
        this.setAttribute("locale", value);
      else
        this.removeAttribute("locale");
    }
    get value() {
      return this._model.value;
    }
    set value(value) {
      const next = value || "";
      if (next && !isDate(next))
        throw new TypeError(`Invalid calendar value: ${next}`);
      if (next === this._model.value)
        return;
      this._model.setValue(next);
      this._reflect("value", next);
      if (this._connected)
        this.render();
    }
    get display() {
      return this._model.display;
    }
    set display(value) {
      this._setDisplay(value, { emit: false });
    }
    get focusedDate() {
      return this._model.focused;
    }
    set focusedDate(value) {
      const next = value || "";
      if (next === this._model.focused)
        return;
      this.focusDate(next, { moveFocus: false });
    }
    get min() {
      const value = this.getAttribute("min") || "";
      return isDate(value) ? value : "";
    }
    set min(value) {
      if (value)
        this.setAttribute("min", value);
      else
        this.removeAttribute("min");
    }
    get max() {
      const value = this.getAttribute("max") || "";
      return isDate(value) ? value : "";
    }
    set max(value) {
      if (value)
        this.setAttribute("max", value);
      else
        this.removeAttribute("max");
    }
    get firstDay() {
      return parseFirstDay(this.getAttribute("first-day") || "1");
    }
    set firstDay(value) {
      this.setAttribute("first-day", String(value));
    }
    get selection() {
      return this.getAttribute("selection") === "none" ? "none" : "single";
    }
    set selection(value) {
      this.setAttribute("selection", value === "none" ? "none" : "single");
    }
    get monthFormat() {
      return this.getAttribute("month-format") === "short" ? "short" : "long";
    }
    set monthFormat(value) {
      if (value === "short")
        this.setAttribute("month-format", "short");
      else
        this.removeAttribute("month-format");
    }
    get highlightedRange() {
      return { ...this._highlightedRange };
    }
    set highlightedRange(value) {
      const next = normalizeRange(value);
      if (next.start === this._highlightedRange.start && next.end === this._highlightedRange.end)
        return;
      this._highlightedRange = next;
      if (this._connected)
        this.render();
    }
    get fixedWeeks() {
      return this.hasAttribute("fixed-weeks");
    }
    set fixedWeeks(value) {
      this.toggleAttribute("fixed-weeks", Boolean(value));
    }
    get showWeekNumbers() {
      return this.hasAttribute("show-week-numbers");
    }
    set showWeekNumbers(value) {
      this.toggleAttribute("show-week-numbers", Boolean(value));
    }
    get messages() {
      return this._messages;
    }
    set messages(value) {
      this._messages = { ...getDefaultMessages(), ...value || {} };
      if (this._connected)
        this.render();
    }
    get source() {
      return this._source;
    }
    set source(value) {
      this._source = value || null;
      this.refreshSource();
    }
    get dateState() {
      return this._dateState;
    }
    set dateState(value) {
      this._dateState = typeof value === "function" ? value : null;
      if (this._connected)
        this.render();
    }
    get renderDay() {
      return this._renderDay;
    }
    set renderDay(value) {
      this._renderDay = typeof value === "function" ? value : null;
      if (this._connected)
        this.render();
    }
    get isDateDisabled() {
      return this._isDateDisabled;
    }
    set isDateDisabled(value) {
      this._isDateDisabled = typeof value === "function" ? value : null;
      if (this._connected)
        this.render();
    }
    _syncModel() {
      const firstDay = this.firstDay;
      this._model.firstDay = firstDay;
      const attrValue = this.getAttribute("value") || "";
      if (!attrValue || isDate(attrValue))
        this._model.value = attrValue;
      const attrDisplay = this.getAttribute("display") || "";
      if (attrDisplay) {
        try {
          this._model.setDisplay(attrDisplay);
        } catch {}
      } else if (this._model.value) {
        this._model.display = monthKey(this._model.value);
        this._model.focused = this._model.value;
      }
      this._model.focused = this._clamp(this._model.focused);
      if (!this.getAttribute("display"))
        this._model.display = monthKey(this._model.focused);
    }
    _reflect(name, value) {
      this._rendering = true;
      if (value) {
        if (this.getAttribute(name) !== value)
          this.setAttribute(name, value);
      } else if (this.hasAttribute(name)) {
        this.removeAttribute(name);
      }
      this._rendering = false;
    }
    _clamp(value) {
      return clampDate(value, this.min, this.max);
    }
    _weeks(display = this.display) {
      const weeks = getMonthWeeks(display, { firstDay: this.firstDay });
      if (!this.fixedWeeks || weeks.length >= 6)
        return weeks;
      let cursor = weeks[weeks.length - 1]?.[6] || "";
      while (weeks.length < 6 && cursor) {
        const week = [];
        for (let i = 1;i <= 7; i++)
          week.push(addDays(cursor, i));
        weeks.push(week);
        cursor = week[6];
      }
      return weeks;
    }
    _focusTargetKey(element) {
      if (element.matches(".dp-month-select, .dp-year-select, .dp-year-input") && element.id) {
        return `#${CSS.escape(element.id)}`;
      }
      if (element.matches(".dp-nav[data-calendar-action]")) {
        return `.dp-nav[data-calendar-action="${CSS.escape(element.dataset.calendarAction || "")}"]`;
      }
      if (element.matches(".dp-day[data-date]")) {
        const date = element.getAttribute("data-date") || "";
        if (isDate(date))
          return `.dp-day[data-date="${date}"]`;
      }
      return "";
    }
    _range(display = this.display) {
      const weeks = this._weeks(display);
      const first = weeks[0];
      const last = weeks[weeks.length - 1];
      if (!first || !last)
        throw new Error("Calendar month produced no weeks");
      return { start: first[0], end: last[6] };
    }
    getDateState(date) {
      const fromSource = this._sourceStates.get(date) || {};
      const local = this._dateState?.(date, { ...fromSource }) || {};
      const state = { ...fromSource, ...local };
      const outsideBounds = this.min && compareDates(date, this.min) < 0 || this.max && compareDates(date, this.max) > 0;
      const explicitlyEnabled = state.enabled === true;
      const disabledByRule = explicitlyEnabled ? false : Boolean(this._isDateDisabled?.(date));
      const disabled = Boolean(outsideBounds) || Boolean(state.disabled) || disabledByRule;
      return { ...state, disabled };
    }
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
    async ensureDate(date) {
      if (!isDate(date) || !this._source)
        return true;
      return await this._loadDisplay(monthKey(date), false) === "loaded";
    }
    async _loadDisplay(display, rerender = true) {
      if (!this._source)
        return "loaded";
      const range = this._range(display);
      const key = `${range.start}/${range.end}`;
      if (this._loadedRanges.has(key))
        return "loaded";
      if (key === this._loadingKey && this._loadingPromise)
        return this._loadingPromise;
      this._loadController?.abort();
      const controller = new AbortController;
      this._loadController = controller;
      this._loadingKey = key;
      const source = this._source;
      const promise = (async () => {
        this.toggleAttribute("data-loading", true);
        this.dispatchEvent(new CustomEvent("dateloadstart", { detail: range, bubbles: true }));
        try {
          const loader = typeof source === "function" ? source : source?.load?.bind(source);
          if (!loader)
            throw new TypeError("Date source must be a function or expose load(range, { signal })");
          const payload = await loader(range, { signal: controller.signal });
          if (controller.signal.aborted)
            return "cancelled";
          for (const [date, state] of normalizeDateStates(payload))
            this._sourceStates.set(date, state);
          this._loadedRanges.add(key);
          this.dispatchEvent(new CustomEvent("dateloadend", { detail: range, bubbles: true }));
          if (rerender && this._connected && monthKey(this.display) === monthKey(display))
            this.render(false);
          return "loaded";
        } catch (error) {
          if (controller.signal.aborted)
            return "cancelled";
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
    _setDisplay(display, options = {}) {
      const previous = this._model.display;
      this._model.setDisplay(display);
      this._model.focused = this._clamp(this._model.focused);
      this._model.display = monthKey(this._model.focused);
      this._reflect("display", this._model.display);
      if (this._connected)
        this.render();
      if (options.emit !== false && previous !== this._model.display)
        this._emitDisplayChange();
      return this._model.display;
    }
    _emitDisplayChange() {
      const range = this._range();
      this.dispatchEvent(new CustomEvent("displaychange", {
        detail: { display: this.display, ...range },
        bubbles: true
      }));
    }
    previousMonth() {
      return this._setDisplay(shiftMonth(this.display, -1));
    }
    nextMonth() {
      return this._setDisplay(shiftMonth(this.display, 1));
    }
    focusDate(date, options = {}) {
      if (!isDate(date))
        throw new TypeError(`Invalid date: ${date}`);
      const next = this._clamp(date);
      const previousDisplay = this.display;
      const previousFocused = this._model.focused;
      const moveFocus = options.moveFocus !== false;
      this._model.setFocused(next);
      this._reflect("display", this._model.display);
      if (previousDisplay !== this.display) {
        if (this._connected)
          this.render();
        this._emitDisplayChange();
      } else if (this._connected && previousFocused !== this._model.focused) {
        this._moveFocusDom(previousFocused, this._model.focused, moveFocus);
      }
      if (moveFocus)
        queueMicrotask(() => this.focusGrid());
    }
    _moveFocusDom(previous, next, moveFocus = true) {
      const prevCell = previous ? this.querySelector(`.dp-day[data-date="${CSS.escape(previous)}"]`) : null;
      const nextCell = this.querySelector(`.dp-day[data-date="${CSS.escape(next)}"]`);
      if (prevCell instanceof HTMLElement)
        prevCell.tabIndex = -1;
      if (nextCell instanceof HTMLElement) {
        nextCell.tabIndex = 0;
        if (moveFocus)
          nextCell.focus();
      } else if (moveFocus) {
        this.focusGrid();
      }
    }
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
    focusGrid() {
      const target = this.querySelector(`.dp-day[data-date="${CSS.escape(this.focusedDate)}"]`);
      if (target instanceof HTMLElement)
        target.focus();
    }
    async _activate(date) {
      const confirmed = await this.ensureDate(date);
      const state = this.getDateState(date);
      if (!confirmed || state.disabled) {
        this.dispatchEvent(new CustomEvent("dateinvalid", { detail: { date, state }, bubbles: true }));
        return false;
      }
      const accepted = this.dispatchEvent(new CustomEvent("dateactivate", {
        detail: { date, state },
        bubbles: true,
        cancelable: true
      }));
      if (!accepted)
        return false;
      if (this.selection === "single") {
        const previousValue = this._model.value;
        this._model.setValue(date);
        this._reflect("value", date);
        this.dispatchEvent(new CustomEvent("datechange", { detail: { value: date }, bubbles: true }));
        this.dispatchEvent(new Event("change", { bubbles: true }));
        if (this._connected) {
          if (monthKey(date) === this.display)
            this._moveSelectionDom(previousValue, date);
          else
            this.render();
        }
      } else if (this._connected) {
        if (monthKey(date) !== this.display)
          this.render();
      }
      return true;
    }
    _onClick(event) {
      const target = event.target;
      if (!(target instanceof Element))
        return;
      const nav = target.closest("[data-calendar-action]");
      if (nav instanceof HTMLButtonElement) {
        const action = nav.dataset.calendarAction;
        if (action === "previous")
          this.previousMonth();
        if (action === "next")
          this.nextMonth();
        return;
      }
      const cell = target.closest(".dp-day[data-date]");
      if (!(cell instanceof HTMLTableCellElement))
        return;
      const date = cell.dataset.date || "";
      if (!isDate(date))
        return;
      const previousDisplay = this.display;
      this._model.setFocused(this._clamp(date));
      this._reflect("display", this._model.display);
      if (previousDisplay !== this.display)
        this._emitDisplayChange();
      this._activate(date);
    }
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
          if (this._connected)
            this.render(false);
          return;
        }
        this._setDisplay(`${String(year).padStart(4, "0")}-${this.display.slice(5, 7)}`);
      }
    }
    _onFocusIn(event) {
      const target = event.target;
      if (!(target instanceof HTMLTableCellElement) || !target.matches(".dp-day[data-date]"))
        return;
      const date = target.dataset.date || "";
      if (isDate(date))
        this._model.focused = date;
    }
    _onKeyDown(event) {
      const target = event.target;
      if (!(target instanceof HTMLTableCellElement) || !target.matches(".dp-day[data-date]"))
        return;
      const date = target.dataset.date || this.focusedDate;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._activate(date);
        return;
      }
      const anchorFocused = this._model.focused;
      const anchorDisplay = this._model.display;
      this._model.firstDay = this.firstDay;
      this._model.setFocused(date, { follow: false });
      if (event.key === "ArrowLeft")
        this._model.moveFocusDays(-1);
      else if (event.key === "ArrowRight")
        this._model.moveFocusDays(1);
      else if (event.key === "ArrowUp")
        this._model.moveFocusDays(-7);
      else if (event.key === "ArrowDown")
        this._model.moveFocusDays(7);
      else if (event.key === "Home")
        this._model.focusWeekStart();
      else if (event.key === "End")
        this._model.focusWeekEnd();
      else if (event.key === "PageUp")
        event.shiftKey ? this._model.moveFocusYears(-1) : this._model.moveFocusMonths(-1);
      else if (event.key === "PageDown")
        event.shiftKey ? this._model.moveFocusYears(1) : this._model.moveFocusMonths(1);
      else
        return;
      const next = this._model.focused;
      this._model.focused = anchorFocused;
      this._model.display = anchorDisplay;
      if (!next)
        return;
      event.preventDefault();
      this.focusDate(this._clamp(next));
    }
    render(load = true) {
      if (!this._connected)
        return;
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
      const weekHeader = showWeeks ? `<th scope="col" class="dp-week-heading" abbr="${escapeHtml(this._messages.week)}">#</th>` : "";
      const monthOptions = names.map((name, index) => {
        const month = index + 1;
        const key = `${String(displayYear).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
        const disabled = minMonth && key < minMonth || maxMonth && key > maxMonth;
        return `<option value="${String(month).padStart(2, "0")}"${month === displayMonth ? " selected" : ""}${disabled ? " disabled" : ""}>${escapeHtml(name)}</option>`;
      }).join("");
      const dayHeaders = weekdayShort.map((name, index) => `<th scope="col" abbr="${escapeHtml(weekdayLong[index])}">${escapeHtml(name.replace(".", ""))}</th>`).join("");
      const rows = weeks.map((week) => {
        const weekNumber = showWeeks ? `<th scope="row" class="dp-week-number">${isoWeekNumber(week[0])}</th>` : "";
        const cells = week.map((date) => {
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
            state.disabled ? this._messages.unavailable : ""
          ].filter(Boolean).join(". ");
          return `<td class="dp-day" data-date="${date}"${outside ? ' data-outside-month="true"' : ""}${isToday ? ' data-today="true" aria-current="date"' : ""}${selected ? ' data-selected="true" aria-selected="true"' : ""}${rangeAttributes(position)}${state.disabled ? ' data-disabled="true" aria-disabled="true"' : ""} tabindex="${focused ? "0" : "-1"}" aria-label="${escapeHtml(label)}"><span class="dp-day-number" aria-hidden="true">${Number(date.slice(8, 10))}</span><span class="dp-day-extra" aria-hidden="true"></span></td>`;
        }).join("");
        return `<tr>${weekNumber}${cells}</tr>`;
      }).join("");
      const focusedElement = document.activeElement;
      const focusKey = focusedElement instanceof HTMLElement && this.contains(focusedElement) ? this._focusTargetKey(focusedElement) : "";
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
          if (selector.startsWith(".dp-day[data-date=")) {
            selector = `.dp-day[data-date="${CSS.escape(this._model.focused)}"]`;
          }
          const target = this.querySelector(selector);
          if (target instanceof HTMLElement)
            target.focus();
        });
      }
      if (this._renderDay) {
        for (const cell of this.querySelectorAll(".dp-day[data-date]")) {
          if (!(cell instanceof HTMLTableCellElement))
            continue;
          const date = cell.dataset.date || "";
          const extra = cell.querySelector(".dp-day-extra");
          if (!(extra instanceof HTMLElement))
            continue;
          const content = this._renderDay(date, this.getDateState(date));
          if (content instanceof Node)
            extra.append(content);
          else if (content !== undefined && content !== null)
            extra.textContent = String(content);
        }
      }
      if (load)
        this._loadDisplay(display);
    }
  }

  // node_modules/@lekoala/floating/src/floating.js
  function crossAxisFor(side) {
    return side === "top" || side === "bottom" ? "x" : "y";
  }
  function parsePlacement(placement) {
    const [side, align = null] = placement.split("-");
    return { side, align, crossAxis: crossAxisFor(side) };
  }
  function flipSide(side) {
    return { top: "bottom", bottom: "top", left: "right", right: "left" }[side] || side;
  }
  function computeCoords(reference, floating, side, align, rtl, distance) {
    const crossAxis = crossAxisFor(side);
    const commonX = reference.x + reference.width / 2 - floating.width / 2;
    const commonY = reference.y + reference.height / 2 - floating.height / 2;
    const commonAlign = reference[crossAxis === "x" ? "width" : "height"] / 2 - floating[crossAxis === "x" ? "width" : "height"] / 2;
    let coords;
    switch (side) {
      case "top":
        coords = { x: commonX, y: reference.y - floating.height - distance };
        break;
      case "bottom":
        coords = { x: commonX, y: reference.y + reference.height + distance };
        break;
      case "right":
        coords = { x: reference.x + reference.width + distance, y: commonY };
        break;
      case "left":
        coords = { x: reference.x - floating.width - distance, y: commonY };
        break;
      default:
        coords = { x: reference.x, y: reference.y };
    }
    if (align === "start" || align === "end") {
      const direction = (rtl && crossAxis === "x" ? -1 : 1) * (align === "end" ? 1 : -1);
      coords[crossAxis] += commonAlign * direction;
    }
    return coords;
  }
  function overflowOn(position, size, start, end) {
    return Math.max(start - position, 0) + Math.max(position + size - end, 0);
  }
  function isRTL(element) {
    const direction = "dir" in element ? element.dir : "";
    if (direction === "rtl")
      return true;
    if (direction === "ltr")
      return false;
    const win = element.ownerDocument?.defaultView;
    if (win?.CSS?.supports?.("selector(:dir(rtl))") && typeof element.matches === "function") {
      return element.matches(":dir(rtl)");
    }
    return Boolean(win?.Element && element instanceof win.Element && win.getComputedStyle(element).direction === "rtl");
  }
  var STABLE_SCROLLBAR_MAX_WIDTH = 25;
  function getViewportBoundary(doc) {
    const win = doc.defaultView;
    if (!win)
      return null;
    const docEl = doc.documentElement;
    const visualViewport = win.visualViewport;
    const x = visualViewport?.offsetLeft || 0;
    const y = visualViewport?.offsetTop || 0;
    let width = visualViewport?.width || docEl.clientWidth || win.innerWidth;
    const height = visualViewport?.height || docEl.clientHeight || win.innerHeight;
    const reserved = doc.compatMode === "BackCompat" ? width - docEl.clientWidth : docEl.clientWidth - docEl.getBoundingClientRect().width;
    if (reserved > 0 && reserved <= STABLE_SCROLLBAR_MAX_WIDTH) {
      const gutter = win.getComputedStyle?.(docEl).scrollbarGutter;
      if (gutter && gutter !== "auto")
        width -= reserved;
    }
    return { x, y, width, height, right: x + width, bottom: y + height };
  }
  function getBoundary(reference, options) {
    return options.scope ? options.scope.getBoundingClientRect() : getViewportBoundary(reference.ownerDocument);
  }
  function clampToBoundary(position, size, start, end, padding) {
    const paddedMin = start + padding;
    const paddedMax = end - size - padding;
    const fitsPadded = paddedMax >= paddedMin;
    const min = fitsPadded ? paddedMin : start;
    const max = fitsPadded ? paddedMax : end - size;
    return Math.max(min, Math.min(position, max));
  }
  function arrowPercent(referenceCenter, boxStart, size) {
    if (!size)
      return 50;
    const percent = (referenceCenter - boxStart) / size * 100;
    return Math.round(Math.min(100, Math.max(0, percent)) * 1000) / 1000;
  }
  function isOutsideBoundary(rect, boundary) {
    return rect.right < boundary.x || rect.left > boundary.right || rect.bottom < boundary.y || rect.top > boundary.bottom;
  }
  function getAvailableHeight(referenceRect, side, boundary, distance, padding) {
    if (side === "top") {
      return Math.max(0, referenceRect.top - boundary.y - distance - padding);
    }
    if (side === "bottom") {
      return Math.max(0, boundary.bottom - referenceRect.bottom - distance - padding);
    }
    return Math.max(0, boundary.height - padding * 2);
  }
  function isVisible(element) {
    if (element.hidden)
      return false;
    if (typeof element.checkVisibility === "function")
      return element.checkVisibility();
    return element.getClientRects().length > 0;
  }
  function getFloatingSize(floating) {
    const width = floating.offsetWidth;
    const height = floating.offsetHeight;
    if (width && height)
      return { width, height };
    const rect = floating.getBoundingClientRect();
    return { width: width || rect.width, height: height || rect.height };
  }
  var trackers = new WeakMap;
  var TYPE_PRIORITY = { scroll: 0, resize: 1, "element-resize": 2 };
  function createTracker(doc) {
    const win = doc.defaultView;
    if (!win)
      throw new TypeError("floating must belong to a document with a browsing context");
    const subscriptions = new Set;
    const pending = new Map;
    const ResizeObserverCtor = win.ResizeObserver;
    let tick = false;
    let listening = false;
    const visualViewport = win.visualViewport;
    function queue(subscription, type) {
      const current = pending.get(subscription);
      if (current === undefined || TYPE_PRIORITY[type] > TYPE_PRIORITY[current]) {
        pending.set(subscription, type);
      }
    }
    function scheduleFlush() {
      if (tick)
        return;
      tick = true;
      win.requestAnimationFrame(() => {
        const notifications = [...pending];
        pending.clear();
        tick = false;
        for (const [subscription, type] of notifications) {
          if (!subscriptions.has(subscription) || !subscription.floating.isConnected)
            continue;
          subscription.callback({ type });
        }
      });
    }
    function notifyAll(type) {
      for (const subscription of subscriptions)
        queue(subscription, type);
      scheduleFlush();
    }
    function observeSizes(subscription) {
      if (!ResizeObserverCtor)
        return null;
      const primed = new Set;
      const observer = new ResizeObserverCtor((entries) => {
        let changed = false;
        for (const entry of entries) {
          if (primed.has(entry.target))
            changed = true;
          else
            primed.add(entry.target);
        }
        if (!changed)
          return;
        queue(subscription, "element-resize");
        scheduleFlush();
      });
      const { reference, floating } = subscription;
      if (reference)
        observer.observe(reference);
      if (floating !== reference)
        observer.observe(floating);
      return observer;
    }
    const onScroll = () => notifyAll("scroll");
    const onResize = () => notifyAll("resize");
    function startListening() {
      if (listening)
        return;
      doc.addEventListener("scroll", onScroll, { passive: true, capture: true });
      win.addEventListener("resize", onResize, { passive: true });
      visualViewport?.addEventListener("scroll", onScroll, { passive: true });
      visualViewport?.addEventListener("resize", onResize, { passive: true });
      listening = true;
    }
    function stopListening() {
      if (!listening)
        return;
      doc.removeEventListener("scroll", onScroll, { capture: true });
      win.removeEventListener("resize", onResize);
      visualViewport?.removeEventListener("scroll", onScroll);
      visualViewport?.removeEventListener("resize", onResize);
      listening = false;
    }
    return {
      add(reference, floating, callback) {
        const subscription = { reference, floating, callback };
        subscriptions.add(subscription);
        startListening();
        const observer = observeSizes(subscription);
        let stopped = false;
        return () => {
          if (stopped)
            return;
          stopped = true;
          subscriptions.delete(subscription);
          pending.delete(subscription);
          observer?.disconnect();
          if (subscriptions.size === 0)
            stopListening();
        };
      }
    };
  }
  function trackerFor(element) {
    const doc = element.ownerDocument;
    let tracker = trackers.get(doc);
    if (!tracker) {
      tracker = createTracker(doc);
      trackers.set(doc, tracker);
    }
    return tracker;
  }
  function autoUpdate(reference, floating, callback) {
    if (!floating?.ownerDocument) {
      throw new TypeError("autoUpdate() expects a floating HTMLElement");
    }
    if (reference && reference.ownerDocument !== floating.ownerDocument) {
      throw new TypeError("reference and floating must belong to the same document");
    }
    if (typeof callback !== "function")
      throw new TypeError("callback must be a function");
    return trackerFor(floating).add(reference, floating, callback);
  }
  function positionOnce(reference, floating, options) {
    if (!isVisible(floating))
      return null;
    const placement = options.placement || "bottom-start";
    const distance = options.distance || 0;
    const flip = options.flip !== false;
    const shift = options.shift !== false;
    const shiftPadding = options.shiftPadding ?? 4;
    let { side, align, crossAxis } = parsePlacement(placement);
    const rtl = align ? isRTL(reference) : false;
    const rects = reference.getClientRects();
    const referenceRect = side === "bottom" ? rects[rects.length - 1] : rects[0];
    if (!referenceRect)
      return null;
    const boundary = getBoundary(reference, options);
    if (!boundary || isOutsideBoundary(referenceRect, boundary))
      return null;
    const floatingRect = getFloatingSize(floating);
    const limits = {
      x: { size: floatingRect.width, start: boundary.x, end: boundary.right },
      y: { size: floatingRect.height, start: boundary.y, end: boundary.bottom }
    };
    const place = (nextSide, nextAlign) => computeCoords(referenceRect, floatingRect, nextSide, nextAlign, rtl, distance);
    const overflowAt = (position, axis) => {
      const { size, start, end } = limits[axis];
      return overflowOn(position, size, start + shiftPadding, end - shiftPadding);
    };
    const shiftedOverflowAt = (position, axis) => {
      const { size, start, end } = limits[axis];
      return overflowAt(shift ? clampToBoundary(position, size, start, end, shiftPadding) : position, axis);
    };
    let coords = place(side, align);
    if (flip) {
      const mainAxis = crossAxis === "x" ? "y" : "x";
      let overflow = overflowAt(coords[mainAxis], mainAxis);
      if (overflow > 0) {
        const opposite = flipSide(side);
        const flipped = place(opposite, align);
        const flippedOverflow = overflowAt(flipped[mainAxis], mainAxis);
        if (flippedOverflow < overflow) {
          side = opposite;
          coords = flipped;
          overflow = flippedOverflow;
        }
      }
      if (mainAxis === "x" && overflow > 0) {
        const above = place("top", align);
        const below = place("bottom", align);
        const useBottom = overflowAt(below.y, "y") < overflowAt(above.y, "y");
        const candidate = useBottom ? below : above;
        const swapped = overflowAt(candidate.y, "y") + shiftedOverflowAt(candidate.x, "x");
        if (swapped < overflow + shiftedOverflowAt(coords.y, "y")) {
          side = useBottom ? "bottom" : "top";
          crossAxis = "x";
          coords = candidate;
        }
      }
    }
    if (crossAxis === "x" && shift && align) {
      const overflow = overflowAt(coords.x, "x");
      if (overflow > 0) {
        const nextAlign = align === "end" ? "start" : "end";
        const candidate = place(side, nextAlign);
        if (overflowAt(candidate.x, "x") < overflow) {
          align = nextAlign;
          coords = candidate;
        }
      }
    }
    if (shift) {
      const { size, start, end } = limits[crossAxis];
      coords[crossAxis] = clampToBoundary(coords[crossAxis], size, start, end, shiftPadding);
    }
    const arrowX = arrowPercent(referenceRect.x + referenceRect.width / 2, coords.x, floatingRect.width);
    const arrowY = arrowPercent(referenceRect.y + referenceRect.height / 2, coords.y, floatingRect.height);
    const availableHeight = `${getAvailableHeight(referenceRect, side, boundary, distance, shiftPadding)}px`;
    const { style } = floating;
    const roomChanged = style.getPropertyValue("--available-height") !== availableHeight;
    style.left = `${coords.x}px`;
    style.top = `${coords.y}px`;
    style.setProperty("--arrow-x", `${arrowX}%`);
    style.setProperty("--arrow-y", `${arrowY}%`);
    style.setProperty("--available-height", availableHeight);
    const resolved = align ? `${side}-${align}` : side;
    floating.dataset.placement = resolved;
    return {
      width: floatingRect.width,
      height: floatingRect.height,
      roomChanged,
      placement: resolved
    };
  }
  function reposition(reference, floating, options = {}) {
    const measured = positionOnce(reference, floating, options);
    if (!measured)
      return false;
    if (measured.roomChanged) {
      const settled = getFloatingSize(floating);
      if (settled.width !== measured.width || settled.height !== measured.height) {
        positionOnce(reference, floating, {
          ...options,
          placement: measured.placement,
          flip: false
        });
      }
    }
    return true;
  }

  // src/date-field.js
  class DateFieldController {
    constructor(input, options = {}) {
      this.input = input;
      this.messages = options.messages || {};
      this.adapter = createDateAdapter(options.locale || "");
      this.hidden = null;
      this.canonical = "";
      this._dirty = false;
      this._commitId = 0;
      this._originalName = input.getAttribute("name") || "";
      this._attributeObserver = null;
      this.onAttributesChanged = null;
      this.confirm = null;
    }
    setLocale(locale) {
      this.adapter = createDateAdapter(locale || "");
    }
    setMessages(messages) {
      this.messages = messages || {};
    }
    format(value) {
      return this.adapter.format(value);
    }
    parse(text) {
      return this.adapter.parse(text);
    }
    get placeholder() {
      return this.adapter.placeholder;
    }
    get isDisabled() {
      return this.input.disabled;
    }
    get isReadOnly() {
      return this.input.readOnly;
    }
    setupFormValue() {
      const input = this.input;
      this._originalName = input.getAttribute("name") || "";
      this._attributeObserver = new MutationObserver(() => this.onAttributesChanged?.());
      this._attributeObserver.observe(input, {
        attributes: true,
        attributeFilter: ["disabled", "readonly", "name", "form"]
      });
      this.syncInputState();
    }
    syncInputState() {
      const input = this.input;
      const name = input.getAttribute("name") || "";
      if (name) {
        if (!this.hidden) {
          const hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.value = this.canonical;
          input.insertAdjacentElement("afterend", hidden);
          this.hidden = hidden;
        }
        if (this.hidden)
          this.hidden.name = name;
        input.removeAttribute("name");
      }
      if (this.hidden) {
        if (input.hasAttribute("form"))
          this.hidden.setAttribute("form", input.getAttribute("form") || "");
        else
          this.hidden.removeAttribute("form");
        this.hidden.disabled = input.disabled;
      }
    }
    dirty() {
      this._commitId++;
    }
    get isDirty() {
      return this._dirty;
    }
    handleInput() {
      const input = this.input;
      this._dirty = true;
      this.dirty();
      if (this.hidden)
        this.hidden.value = "";
      const text = input.value.trim();
      if (!text) {
        input.setCustomValidity("");
        return;
      }
      const canonical = this.canonical ? this.adapter.format(this.canonical) : "";
      input.setCustomValidity(text === canonical ? "" : this.messages.invalidDate);
    }
    async commit() {
      const input = this.input;
      const commitId = ++this._commitId;
      const text = input.value.trim();
      if (!text) {
        if (commitId !== this._commitId)
          return { status: "stale" };
        input.setCustomValidity("");
        return { status: "clear", value: "" };
      }
      const parsed = this.adapter.parse(text);
      if (!parsed) {
        if (commitId !== this._commitId)
          return { status: "stale" };
        if (this.hidden)
          this.hidden.value = "";
        input.setCustomValidity(this.messages.invalidDate);
        return { status: "invalid" };
      }
      if (this.confirm) {
        const result = await this.confirm(parsed);
        if (commitId !== this._commitId)
          return { status: "stale" };
        if (!result?.ok) {
          if (this.hidden)
            this.hidden.value = "";
          input.setCustomValidity(result?.message || this.messages.unavailableDate);
          return { status: "invalid" };
        }
      }
      return { status: "ok", value: parsed };
    }
    setCanonical(value, options = {}) {
      const next = value || "";
      if (next && !isDate(next))
        throw new TypeError(`Invalid date-picker value: ${next}`);
      this.dirty();
      this.canonical = next;
      this._dirty = false;
      if (this.hidden)
        this.hidden.value = next;
      if (options.format !== false)
        this.input.value = next ? this.adapter.format(next) : "";
      this.input.setCustomValidity("");
    }
    restoreDefault() {
      const text = String(this.input.defaultValue ?? "").trim();
      const parsed = isDate(text) ? text : this.adapter.parse(text);
      return parsed && isDate(parsed) ? parsed : "";
    }
    teardown() {
      this._attributeObserver?.disconnect();
      this._attributeObserver = null;
      const hiddenName = this.hidden?.getAttribute("name") || this._originalName;
      if (hiddenName)
        this.input.setAttribute("name", hiddenName);
      this.hidden?.remove();
      this.hidden = null;
    }
  }

  // src/time.js
  var TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
  function parseTimeParts(value) {
    const match = TIME_RE.exec(String(value || ""));
    if (!match)
      return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = match[3] === undefined ? 0 : Number(match[3]);
    const millisecond = match[4] === undefined ? 0 : Number(match[4].padEnd(3, "0"));
    if (hour > 23 || minute > 59 || second > 59 || millisecond > 999)
      return null;
    return { hour, minute, second, millisecond };
  }
  function isTime(value) {
    return parseTimeParts(value) !== null;
  }
  function toMillis(parts) {
    return ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000 + parts.millisecond;
  }
  function compareTimes(a, b) {
    const left = parseTimeParts(a);
    const right = parseTimeParts(b);
    if (!left || !right)
      throw new TypeError("compareTimes() expects HH:MM values");
    const diff = toMillis(left) - toMillis(right);
    return diff === 0 ? 0 : diff < 0 ? -1 : 1;
  }

  // src/date-picker.js
  var uid2 = 0;

  class DatePickerElement extends HTMLElement {
    static observedAttributes = ["value", "locale", "min", "max", "open-on-focus", "month-format"];
    constructor() {
      super();
      this._id = `date-picker-${++uid2}`;
      this._connected = false;
      this._reflecting = false;
      this._value = "";
      this._input = null;
      this._field = null;
      this._fields = null;
      this._range = null;
      this._orderTags = new Set;
      this._timeFields = [null, null];
      this._timeOrderOwned = new Set;
      this._lastFocusEndpoint = "";
      this._rangeCommitId = 0;
      this._pendingIntents = new Map;
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
      this._source = null;
      this._dateState = null;
      this._renderDay = null;
      this._isDateDisabled = null;
    }
    _rangeMode() {
      return this.hasAttribute("range") && Boolean(this._range);
    }
    connectedCallback() {
      if (this._connected)
        return;
      if (this.hasAttribute("range")) {
        this._connectRange();
        return;
      }
      this._connectSingle();
    }
    _connectSingle() {
      const input = this.querySelector(":scope > input:not([type=hidden]):not([type=time]):not([data-time-start]):not([data-time-end])");
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
      const initial = this.getAttribute("value") || (isDate(input.value) ? input.value : adapter.parse(input.value));
      if (initial && isDate(initial))
        this._setValue(initial, { emit: false, format: true });
      else if (!input.value)
        this._setValue("", { emit: false, format: false });
      else
        input.setCustomValidity(this._messages.invalidDate);
      if (this._field.hidden)
        this._field.hidden.defaultValue = this._value;
      if (input.getAttribute("value") == null && input.defaultValue === "") {
        input.defaultValue = input.value;
      }
    }
    _discoverTimeFields() {
      this._timeFields = [null, null];
      const markers = ["data-time-start", "data-time-end"];
      for (const [index, marker] of markers.entries()) {
        const matches = this.querySelectorAll(`:scope > input[${marker}]`);
        if (matches.length > 1) {
          console.warn(`<date-picker> expects at most one direct child input[${marker}]; ignoring extras`);
        }
        const candidate = matches[0];
        if (candidate == null)
          continue;
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
        console.warn("<date-picker range> expects direct child inputs marked [data-range-start] and [data-range-end]");
        return;
      }
      this._connected = true;
      this._input = null;
      this._fields = [
        new DateFieldController(startInput, { messages: this._messages, locale: this.locale }),
        new DateFieldController(endInput, { messages: this._messages, locale: this.locale })
      ];
      this._range = new DateRangeController;
      this._rangeOriginalDescribedBy = [
        startInput.getAttribute("aria-describedby") || "",
        endInput.getAttribute("aria-describedby") || ""
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
      if (endInput.value.trim() && !isDate(initialEnd))
        endInput.setCustomValidity(this._messages.invalidDate);
      if (this._fields[0].hidden)
        this._fields[0].hidden.defaultValue = this._range.start;
      if (this._fields[1].hidden)
        this._fields[1].hidden.defaultValue = this._range.end;
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
        for (const field of this._fields || [])
          this._teardownField(field);
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
    _teardownField(field) {
      if (!field)
        return;
      const input = field.input;
      const original = this._fields?.includes(field) ? this._rangeOriginalDescribedBy[this._fields?.indexOf(field) ?? 0] || "" : this._originalDescribedBy;
      field.teardown();
      if (original)
        input.setAttribute("aria-describedby", original);
      else
        input.removeAttribute("aria-describedby");
      input.removeAttribute("role");
      input.removeAttribute("aria-haspopup");
      input.removeAttribute("aria-expanded");
      input.removeAttribute("aria-controls");
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (!this._connected || this._reflecting || oldValue === newValue)
        return;
      if (name === "value") {
        if (this._rangeMode())
          return;
        if (!newValue || isDate(newValue))
          this._setValue(newValue || "", { emit: false, format: true, reflect: false });
        return;
      }
      if (name === "locale")
        this._refreshLocale();
      if (name === "open-on-focus")
        return;
      this._syncCalendarOptions();
      this.validate();
    }
    get input() {
      return this._rangeMode() ? undefined : this._input;
    }
    get calendar() {
      return this._calendar;
    }
    get value() {
      return this._rangeMode() ? undefined : this._value;
    }
    set value(value) {
      if (this._rangeMode()) {
        throw new TypeError("value is not available in range mode; use range");
      }
      if (value && !isDate(value))
        throw new TypeError(`Invalid date-picker value: ${value}`);
      this._setValue(value || "", { emit: false, format: true });
    }
    get range() {
      return this._rangeMode() && this._range ? { ...this._range.range } : undefined;
    }
    set range(value) {
      if (!this._rangeMode())
        throw new TypeError("range is only available on <date-picker range>");
      const { start, end } = normalizeRange(value);
      this._setRange(start, end);
    }
    get locale() {
      return resolveLocale(this.getAttribute("locale") || "");
    }
    set locale(value) {
      if (value)
        this.setAttribute("locale", value);
      else
        this.removeAttribute("locale");
    }
    get monthFormat() {
      return this.getAttribute("month-format") === "short" ? "short" : "long";
    }
    set monthFormat(value) {
      if (value === "short")
        this.setAttribute("month-format", "short");
      else
        this.removeAttribute("month-format");
    }
    get min() {
      const value = this.getAttribute("min") || "";
      return isDate(value) ? value : "";
    }
    set min(value) {
      if (value)
        this.setAttribute("min", value);
      else
        this.removeAttribute("min");
    }
    get max() {
      const value = this.getAttribute("max") || "";
      return isDate(value) ? value : "";
    }
    set max(value) {
      if (value)
        this.setAttribute("max", value);
      else
        this.removeAttribute("max");
    }
    get openOnFocus() {
      return this.getAttribute("open-on-focus") !== "false";
    }
    set openOnFocus(value) {
      if (value === false)
        this.setAttribute("open-on-focus", "false");
      else
        this.removeAttribute("open-on-focus");
    }
    get open() {
      return this._open;
    }
    get messages() {
      return this._messages;
    }
    set messages(value) {
      this._messages = { ...getDefaultMessages(), ...value || {} };
      if (this._calendar)
        this._calendar.messages = this._messages;
      for (const field of this._fields || [])
        field.setMessages(this._messages);
      this._field?.setMessages(this._messages);
      this._refreshButtonLabel();
      this.validate();
    }
    get source() {
      return this._source;
    }
    set source(value) {
      this._source = value || null;
      if (this._calendar)
        this._calendar.source = this._source;
      if (this._connected)
        this.validate();
    }
    get dateState() {
      return this._dateState;
    }
    set dateState(value) {
      this._dateState = typeof value === "function" ? value : null;
      if (this._calendar)
        this._calendar.dateState = this._dateState;
      if (this._connected)
        this.validate();
    }
    get renderDay() {
      return this._renderDay;
    }
    set renderDay(value) {
      this._renderDay = typeof value === "function" ? value : null;
      if (this._calendar)
        this._calendar.renderDay = this._renderDay;
    }
    get isDateDisabled() {
      return this._isDateDisabled;
    }
    set isDateDisabled(value) {
      this._isDateDisabled = typeof value === "function" ? value : null;
      if (this._calendar)
        this._calendar.isDateDisabled = this._isDateDisabled;
      if (this._connected)
        this.validate();
    }
    _adapter() {
      return this._field?.adapter ?? this._fields?.[0]?.adapter ?? createDateAdapter(this.locale);
    }
    _setupFormValue() {
      this._field?.setupFormValue();
    }
    _syncInputState() {
      const input = this._input;
      if (!input)
        return;
      this._field?.syncInputState();
      if (this._button)
        this._button.disabled = input.disabled || input.readOnly;
      if (this._open && (input.disabled || input.readOnly))
        this.hide(false);
    }
    _syncRangeFields() {
      if (!this._fields)
        return;
      for (const field of this._fields)
        field.syncInputState();
      const active = this._range?.activeEndpoint === "end" ? 1 : 0;
      const disabled = this._fields.every((field) => field.input.disabled || field.input.readOnly);
      if (this._button)
        this._button.disabled = disabled;
      if (this._open && (this._fields[active]?.input.disabled || this._fields[active]?.input.readOnly)) {
        this.hide(false);
      }
    }
    _setRangeAria() {
      if (!this._fields || !this._panel || !this._formatHint)
        return;
      for (const field of this._fields) {
        const input = field.input;
        const describedBy = [this._rangeOriginalDescribedBy[this._fields.indexOf(field)], this._formatHint.id].filter(Boolean).join(" ");
        input.setAttribute("aria-describedby", describedBy);
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-haspopup", "dialog");
        input.setAttribute("aria-expanded", "false");
        input.setAttribute("aria-controls", this._panel.id);
      }
    }
    _build(anchorInput) {
      const input = anchorInput || this._input;
      if (!input)
        return;
      const panelId = `${this._id}-panel`;
      const hintId = `${this._id}-format`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "dp-picker-button";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", panelId);
      button.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 16 16" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="1.75" y="3" width="12.5" height="11" rx="1.75"/><path d="M1.75 6.75h12.5"/><path d="M5.25 1.75v2.5M10.75 1.75v2.5"/></svg></span>';
      const panel = document.createElement("div");
      panel.id = panelId;
      panel.className = "dp-picker-panel";
      panel.setAttribute("popover", "manual");
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", this._messages.calendar);
      const calendar = new DateCalendarElement;
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
      if (!input || !button || !calendar)
        return;
      const controller = new AbortController;
      this._controller = controller;
      const { signal } = controller;
      input.addEventListener("input", () => {
        this._field?.handleInput();
      }, { signal });
      input.addEventListener("change", () => void this._commitText(false), { signal });
      input.addEventListener("blur", () => void this._commitText(false), { signal });
      input.addEventListener("focus", (event) => {
        if (!this.openOnFocus || this._suppressFocusOpen)
          return;
        const related = event.relatedTarget;
        if (related instanceof Node && this.contains(related))
          return;
        if (!this._open)
          this.show({ moveFocus: false });
      }, { signal });
      input.addEventListener("keydown", (event) => {
        this._onFieldKeyDown("", event);
      }, { signal });
      for (const [index, timeInput] of this._timeFields.entries()) {
        if (!timeInput)
          continue;
        const endpoint = index === 1 ? "end" : "start";
        timeInput.addEventListener("input", () => this._revalidateTimeOrder(endpoint), { signal });
        timeInput.addEventListener("change", () => this._revalidateTimeOrder(endpoint), { signal });
      }
      button.addEventListener("click", (event) => {
        if (this._open) {
          if (event.detail === 0) {
            setTimeout(() => this._calendar?.focusGrid(), 0);
            return;
          }
          this.hide(false);
          return;
        }
        this.show();
      }, { signal });
      calendar.addEventListener("dateactivate", (event) => {
        const custom = event;
        const date = custom.detail?.date;
        if (!isDate(date))
          return;
        queueMicrotask(() => {
          if (custom.defaultPrevented || !this._connected)
            return;
          if (this._input?.disabled || this._input?.readOnly)
            return;
          this._field?.dirty();
          this._setValue(date, { emit: true, format: true });
          this.hide(false);
          this._focusInput();
        });
      }, { signal });
      calendar.addEventListener("dateloadend", () => void this.validate(), { signal });
      this.ownerDocument.addEventListener("pointerdown", (event) => {
        if (!this._open || event.composedPath().includes(this))
          return;
        this.hide(false);
      }, { capture: true, signal });
      this.ownerDocument.addEventListener("reset", (event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement && this._input && form === this._input.form) {
          this.hide(false);
          queueMicrotask(() => {
            if (!event.defaultPrevented)
              this._restoreDefault();
          });
        }
      }, { capture: true, signal });
      this.addEventListener("keydown", (event) => this._onEscape(event), { signal });
    }
    _bindRange() {
      const button = this._button;
      const calendar = this._calendar;
      if (!this._fields || !button || !calendar)
        return;
      const controller = new AbortController;
      this._controller = controller;
      const { signal } = controller;
      for (const [index, field] of this._fields.entries()) {
        const endpoint = index === 1 ? "end" : "start";
        field.input.addEventListener("input", () => field.handleInput(), { signal });
        field.input.addEventListener("change", () => void this._commitFieldText(endpoint), { signal });
        field.input.addEventListener("blur", () => void this._commitFieldText(endpoint), { signal });
        field.input.addEventListener("focus", (event) => this._onFieldFocus(endpoint, event), { signal });
        field.input.addEventListener("keydown", (event) => this._onFieldKeyDown(endpoint, event), { signal });
      }
      button.addEventListener("click", (event) => {
        if (this._open) {
          if (event.detail === 0) {
            setTimeout(() => this._calendar?.focusGrid(), 0);
            return;
          }
          this.hide(false);
          return;
        }
        this.show();
      }, { signal });
      calendar.addEventListener("click", (event) => this._captureGridIntent(event), { capture: true, signal });
      calendar.addEventListener("keydown", (event) => this._captureGridIntent(event), {
        capture: true,
        signal
      });
      calendar.addEventListener("dateactivate", (event) => {
        const custom = event;
        const date = custom.detail?.date;
        if (!isDate(date))
          return;
        queueMicrotask(() => {
          if (custom.defaultPrevented || !this._connected || !this._range)
            return;
          const pending = this._pendingIntents.get(date);
          if (pending === undefined || pending !== this._rangeCommitId)
            return;
          this._pendingIntents.delete(date);
          const result = this._range.activate(date, (which) => {
            const index = which === "end" ? 1 : 0;
            const field = this._fields?.[index];
            return field != null && !field.input.disabled && !field.input.readOnly;
          });
          if (result.status === "refused") {
            this._calendar?.dispatchEvent(new CustomEvent("dateinvalid", {
              detail: { date, state: this._calendar.getDateState(date) },
              bubbles: true
            }));
            return;
          }
          this._setBound(result.endpoint, date, { emit: true, user: true });
          if (result.close || result.status === "complete") {
            this.hide(false);
            this._focusField(result.endpoint);
          }
        });
      }, { signal });
      calendar.addEventListener("dateloadend", () => void this.validate(), { signal });
      this.ownerDocument.addEventListener("pointerdown", (event) => {
        if (!this._open || event.composedPath().includes(this))
          return;
        this.hide(false);
      }, { capture: true, signal });
      this.ownerDocument.addEventListener("reset", (event) => {
        const form = event.target;
        if (form instanceof HTMLFormElement && this._fields && form === this._fields[0].input.form) {
          this.hide(false);
          queueMicrotask(() => {
            if (!event.defaultPrevented)
              this._restoreRangeDefault();
          });
        }
      }, { capture: true, signal });
      this.addEventListener("keydown", (event) => this._onEscape(event), { signal });
    }
    _onFieldKeyDown(endpoint, event) {
      if (event.key === "ArrowDown" || event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        if (this._rangeMode() && endpoint) {
          this._lastFocusEndpoint = endpoint;
          this._range?.focus(endpoint);
        }
        if (this._open) {
          setTimeout(() => this._calendar?.focusGrid(), 0);
        } else {
          this.show();
        }
      } else if (event.key === "Escape" && this._open) {
        event.preventDefault();
        this.hide(false);
      }
    }
    _onFieldFocus(endpoint, event) {
      if (!this._rangeMode() || !endpoint)
        return;
      const switched = endpoint !== this._range?.activeEndpoint;
      this._lastFocusEndpoint = endpoint;
      this._range?.focus(endpoint);
      if (switched) {
        this._rangeCommitId++;
        this._pendingIntents.clear();
      }
      if (!this.openOnFocus || this._suppressFocusOpen)
        return;
      const related = event.relatedTarget;
      if (related instanceof Node && this.contains(related))
        return;
      if (!this._open)
        this.show({ moveFocus: false });
    }
    _captureGridIntent(event) {
      if (!this._rangeMode() || !this._range)
        return;
      if (event.type === "keydown") {
        const key = event.key;
        if (key !== "Enter" && key !== " ")
          return;
      }
      if (!(event.target instanceof Element))
        return;
      const cell = event.target.closest(".dp-day[data-date]");
      const date = cell?.getAttribute("data-date") || "";
      if (!isDate(date))
        return;
      this._pendingIntents.set(date, ++this._rangeCommitId);
    }
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
      if (!calendar)
        return;
      calendar.locale = this.locale;
      calendar.min = this.min;
      calendar.max = this.max;
      calendar.monthFormat = this.monthFormat;
      calendar.messages = this._messages;
      calendar.source = this._source;
      calendar.dateState = this._dateState;
      calendar.renderDay = this._renderDay;
      calendar.isDateDisabled = this._isDateDisabled;
      if (!this._rangeMode() && this._value)
        calendar.value = this._value;
      if (panel)
        panel.setAttribute("aria-label", this._messages.calendar);
    }
    _refreshLocale() {
      const hint = this._formatHint;
      if (!hint)
        return;
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
          if (canonical)
            field.input.value = field.format(canonical);
        }
        this._refreshButtonLabel();
        return;
      }
      const field = this._field;
      if (!field)
        return;
      field.setLocale(this.locale);
      hint.textContent = `${this._messages.formatHint}: ${field.placeholder}`;
      if (!field.input.hasAttribute("placeholder") || this._generatedPlaceholder) {
        field.input.placeholder = field.placeholder;
        this._generatedPlaceholder = true;
      }
      if (this._value)
        field.input.value = field.format(this._value);
      this._refreshButtonLabel();
    }
    _refreshButtonLabel() {
      if (!this._button)
        return;
      if (this._rangeMode()) {
        this._refreshRangeButtonLabel();
        return;
      }
      const prefix = this._value ? this._messages.changeDate : this._messages.chooseDate;
      const suffix = this._value ? `, ${formatLongDate(this._value, this.locale)}` : "";
      this._button.setAttribute("aria-label", `${prefix}${suffix}`);
    }
    _refreshRangeButtonLabel() {
      if (!this._button || !this._range)
        return;
      const { start, end } = this._range;
      const hasRange = Boolean(start && end);
      const prefix = hasRange ? this._messages.changeDate : this._messages.chooseDate;
      const suffix = hasRange ? `, ${formatLongDate(start, this.locale)} – ${formatLongDate(end, this.locale)}` : "";
      this._button.setAttribute("aria-label", `${prefix}${suffix}`);
    }
    _reflectValue(value) {
      this._reflecting = true;
      if (value)
        this.setAttribute("value", value);
      else
        this.removeAttribute("value");
      this._reflecting = false;
    }
    _setValue(value, options = {}) {
      if (value && !isDate(value))
        throw new TypeError(`Invalid date-picker value: ${value}`);
      const previous = this._value;
      this._value = value || "";
      if (options.reflect !== false)
        this._reflectValue(this._value);
      this._field?.setCanonical(this._value, { format: options.format !== false });
      if (this._calendar) {
        this._calendar.value = this._value;
        if (this._value)
          this._calendar.focusedDate = this._value;
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
    async _confirmDate(date) {
      const calendar = this._calendar;
      if (!calendar)
        return { ok: true };
      const display = monthKey(date);
      if (calendar.display !== display)
        calendar.display = display;
      const confirmed = await calendar.ensureDate(date);
      const state = calendar.getDateState(date);
      if (!confirmed || state.disabled)
        return { ok: false, message: this._messages.unavailableDate };
      return { ok: true };
    }
    async _commitText(emit, options = {}) {
      const field = this._field;
      if (!field)
        return false;
      if (!options.force && !field.isDirty)
        return false;
      const result = await field.commit();
      if (result.status === "stale" || result.status === "invalid")
        return false;
      this._setValue(result.value || "", { emit, format: result.status === "ok" });
      return true;
    }
    async _commitFieldText(which) {
      const fields = this._fields;
      if (!fields)
        return false;
      const index = which === "end" ? 1 : 0;
      const field = fields[index];
      if (!field?.isDirty)
        return false;
      const result = await field.commit();
      if (result.status === "stale")
        return false;
      if (result.status === "invalid") {
        this._orderTags.delete(index);
        return false;
      }
      this._setBound(which, result.value || "", { emit: true, user: true, format: result.status === "ok" });
      return true;
    }
    _setBound(which, value, options = {}) {
      if (!this._range)
        return false;
      const fields = this._fields;
      if (!fields)
        return false;
      const index = which === "end" ? 1 : 0;
      const field = fields[index];
      if (!field)
        return false;
      if (options.user === true && (field.input.disabled || field.input.readOnly))
        return false;
      const next = value || "";
      const previous = field.canonical;
      field.setCanonical(next, { format: options.format !== false });
      if (which === "end")
        this._range.end = next;
      else
        this._range.start = next;
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
    _setRange(start, end, options = {}) {
      if (!this._range || !this._fields)
        return;
      this._range.start = start || "";
      this._range.end = end || "";
      this._fields[0].setCanonical(start || "", { format: options.format !== false });
      this._fields[1].setCanonical(end || "", { format: options.format !== false });
      this._syncHighlight();
      this._refreshRangeButtonLabel();
      this._revalidateRange("start");
      this._revalidateRange("end");
      if (options.emit !== false)
        this._emitRangeChange();
    }
    _boundCanonical(which) {
      return this._range ? which === "end" ? this._range.end : this._range.start : "";
    }
    _emitRangeChange() {
      if (!this._range)
        return;
      this.dispatchEvent(new CustomEvent("rangechange", { detail: { ...this._range.range }, bubbles: true }));
    }
    _syncHighlight() {
      if (!this._calendar || !this._range)
        return;
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
    _revalidateRange(which) {
      if (!this._fields || !this._range)
        return;
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
    _revalidateTimeOrder(which) {
      const [startInput, endInput] = this._timeFields;
      const bounds = ["start", "end"];
      const inputs = [startInput, endInput];
      const startValue = startInput && !startInput.disabled ? startInput.value.trim() : "";
      const endValue = endInput && !endInput.disabled ? endInput.value.trim() : "";
      const inverted = Boolean(startInput && endInput && startValue && endValue) && isTime(startValue) && isTime(endValue) && compareTimes(endValue, startValue) < 0;
      for (const [index, bound] of bounds.entries()) {
        const input = inputs[index];
        if (!input)
          continue;
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
      for (const input of this._timeOrderOwned)
        input.setCustomValidity("");
      this._timeOrderOwned.clear();
    }
    _restoreDefault() {
      const field = this._field;
      if (!field)
        return;
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
      this.validate();
    }
    _restoreRangeDefault() {
      if (!this._fields)
        return;
      const start = this._fields[0].restoreDefault();
      const end = this._fields[1].restoreDefault();
      this._setRange(start, end);
      if (this._calendar) {
        const target = this._range?.start || todayISO();
        this._calendar.display = monthKey(target);
        this._calendar.focusedDate = target;
      }
      this.validate();
    }
    _focusField(which) {
      const index = which === "end" ? 1 : 0;
      const input = this._fields?.[index]?.input;
      if (!input)
        return;
      this._suppressFocusOpen = true;
      setTimeout(() => {
        input.focus();
        this._suppressFocusOpen = false;
      }, 0);
    }
    _focusInput() {
      this._suppressFocusOpen = true;
      setTimeout(() => {
        this._input?.focus();
        this._suppressFocusOpen = false;
      }, 0);
    }
    _resolveRangeEndpoint() {
      if (!this._fields)
        return "";
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
    async validate() {
      if (this._rangeMode()) {
        const fields = this._fields;
        if (!fields)
          return true;
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
      if (!input)
        return true;
      if (!input.value.trim()) {
        input.setCustomValidity("");
      } else {
        await this._commitText(false, { force: true });
      }
      this._revalidateTimeOrder("start");
      this._revalidateTimeOrder("end");
      const timesValid = this._timeFields.every((timeInput) => timeInput?.checkValidity() ?? true);
      return input.checkValidity() && timesValid;
    }
    show(options = {}) {
      const panel = this._panel;
      const calendar = this._calendar;
      const button = this._button;
      if (!panel || !calendar || !button || this._open)
        return;
      if (this._rangeMode()) {
        const endpoint = this._resolveRangeEndpoint();
        if (!endpoint)
          return;
        this._range?.focus(endpoint);
        this._rangeCommitId++;
        this._pendingIntents.clear();
        const target = this._boundCanonical(endpoint) || todayISO();
        calendar.display = monthKey(target);
        calendar.focusedDate = target;
        this._lastFocusEndpoint = endpoint;
      } else {
        const input = this._input;
        if (!input || input.disabled || input.readOnly)
          return;
        const target = this._value || this._adapter().parse(input.value) || todayISO();
        calendar.display = monthKey(target);
        calendar.focusedDate = target;
      }
      panel.showPopover();
      this._open = true;
      this._setExpanded(true);
      const position = () => reposition(this, panel, { placement: "bottom-start", distance: 4, shiftPadding: 8 });
      position();
      this._stopTracking = autoUpdate(this, panel, position);
      if (options.moveFocus !== false)
        queueMicrotask(() => calendar.focusGrid());
      this.dispatchEvent(new Event("open", { bubbles: true }));
    }
    _setExpanded(expanded) {
      const value = expanded ? "true" : "false";
      this._input?.setAttribute("aria-expanded", value);
      this._button?.setAttribute("aria-expanded", value);
      for (const field of this._fields || [])
        field.input.setAttribute("aria-expanded", value);
    }
    hide(restoreFocus = false) {
      if (!this._panel || !this._open)
        return;
      this._stopTracking?.();
      this._stopTracking = null;
      try {
        this._panel.hidePopover();
      } catch {}
      this._open = false;
      this._setExpanded(false);
      this._rangeCommitId++;
      this._pendingIntents.clear();
      if (restoreFocus) {
        if (this._rangeMode()) {
          const endpoint = this._restoreFocusEndpoint();
          if (endpoint)
            this._focusField(endpoint);
        } else {
          this._focusInput();
        }
      }
      this.dispatchEvent(new Event("close", { bubbles: true }));
    }
    _restoreFocusEndpoint() {
      const active = this._range?.activeEndpoint || "";
      if (active) {
        const index = active === "end" ? 1 : 0;
        const field = this._fields?.[index];
        if (field && !field.input.disabled && !field.input.readOnly)
          return active;
      }
      return this._resolveRangeEndpoint();
    }
  }

  // src/define.js
  function defineDatePicker() {
    if (!customElements.get("date-calendar"))
      customElements.define("date-calendar", DateCalendarElement);
    if (!customElements.get("date-picker"))
      customElements.define("date-picker", DatePickerElement);
  }
  defineDatePicker();
})();
