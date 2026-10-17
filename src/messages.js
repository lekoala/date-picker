export const DEFAULT_MESSAGES = {
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
  rangeOrderEnd: "End must be on or after start",
};

let defaults = { ...DEFAULT_MESSAGES };

export function getDefaultMessages() {
  return { ...defaults };
}

/** @param {Partial<typeof DEFAULT_MESSAGES>} messages */
export function setDefaultMessages(messages) {
  defaults = { ...defaults, ...messages };
  for (const listener of listeners) listener();
}

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeDefaultMessages(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
