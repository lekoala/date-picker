import {
  addDays,
  addMonths,
  addYears,
  endOfWeek,
  isDate,
  monthKey,
  shiftMonth,
  startOfWeek,
  todayISO,
} from "./date.js";

export class CalendarModel {
  /**
   * @param {{value?:string, display?:string, focused?:string, firstDay?:number}} [options]
   */
  constructor(options = {}) {
    const today = todayISO();
    this.firstDay = options.firstDay ?? 1;
    this.value = options.value && isDate(options.value) ? options.value : "";
    this.focused = options.focused && isDate(options.focused) ? options.focused : this.value || today;
    this.display = options.display ? monthKey(options.display) : monthKey(this.focused);
  }

  /** @param {string} value */
  setValue(value) {
    if (value && !isDate(value)) throw new TypeError(`Invalid value: ${value}`);
    this.value = value || "";
    return this.value;
  }

  /** @param {string} value */
  setDisplay(value) {
    const target = monthKey(value);
    const day = Number(this.focused.slice(8, 10)) || 1;
    const next = addMonths(`${target}-01`, 0);
    const candidate = addDays(next, Math.max(0, day - 1));
    this.focused = monthKey(candidate) === target ? candidate : addDays(shiftMonth(target, 1) + "-01", -1);
    this.display = target;
    return this.display;
  }

  /** @param {string} value @param {{follow?:boolean}} [options] */
  setFocused(value, options = {}) {
    if (!isDate(value)) throw new TypeError(`Invalid focused date: ${value}`);
    this.focused = value;
    if (options.follow !== false) this.display = monthKey(value);
    return this.focused;
  }

  /** @param {number} amount */
  moveFocusDays(amount) {
    return this.setFocused(addDays(this.focused, amount));
  }

  /** @param {number} amount */
  moveFocusMonths(amount) {
    return this.setFocused(addMonths(this.focused, amount));
  }

  /** @param {number} amount */
  moveFocusYears(amount) {
    return this.setFocused(addYears(this.focused, amount));
  }

  focusWeekStart() {
    return this.setFocused(startOfWeek(this.focused, this.firstDay));
  }

  focusWeekEnd() {
    return this.setFocused(endOfWeek(this.focused, this.firstDay));
  }

  /** Header/month-select navigation. Value is intentionally untouched. @param {number} amount */
  navigateMonth(amount) {
    const target = shiftMonth(this.display, amount);
    this.setDisplay(target);
    return this.display;
  }
}
