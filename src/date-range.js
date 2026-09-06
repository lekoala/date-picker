import { compareDates, isDate } from "./date.js";

/** @param {string} a @param {string} b */
function later(a, b) {
  if (!a) return b;
  if (!b) return a;
  return compareDates(a, b) >= 0 ? a : b;
}

/** @param {string} a @param {string} b */
function earlier(a, b) {
  if (!a) return b;
  if (!b) return a;
  return compareDates(a, b) <= 0 ? a : b;
}

/**
 * Link two date pickers without teaching either picker about its sibling.
 * Effective constraint: end >= start and start <= end.
 * @param {import("./date-picker.js").DatePickerElement} start
 * @param {import("./date-picker.js").DatePickerElement} end
 * @returns {() => void}
 */
export function linkDateRange(start, end) {
  const baseStartMax = start.max;
  const baseEndMin = end.min;

  const sync = () => {
    const startValue = isDate(start.value) ? start.value : "";
    const endValue = isDate(end.value) ? end.value : "";
    end.min = later(baseEndMin, startValue);
    start.max = earlier(baseStartMax, endValue);
    void start.validate();
    void end.validate();
  };

  start.addEventListener("valuechange", sync);
  end.addEventListener("valuechange", sync);
  sync();

  return () => {
    start.removeEventListener("valuechange", sync);
    end.removeEventListener("valuechange", sync);
    start.max = baseStartMax;
    end.min = baseEndMin;
  };
}
