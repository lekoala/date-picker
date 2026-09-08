const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;

/**
 * Parse one canonical HTML time value (`HH:MM`, `HH:MM:SS`, `HH:MM:SS.fff`).
 * @param {string} value
 * @returns {{hour:number, minute:number, second:number, millisecond:number} | null}
 */
function parseTimeParts(value) {
  const match = TIME_RE.exec(String(value || ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  const millisecond = match[4] === undefined ? 0 : Number(match[4].padEnd(3, "0"));
  if (hour > 23 || minute > 59 || second > 59 || millisecond > 999) return null;
  return { hour, minute, second, millisecond };
}

/** Civil time check for canonical `input[type=time]` values. @param {string} value */
export function isTime(value) {
  return parseTimeParts(value) !== null;
}

/** @param {{hour:number, minute:number, second:number, millisecond:number}} parts */
function toMillis(parts) {
  return ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000 + parts.millisecond;
}

/**
 * Compare two canonical time values. `09:30` equals `09:30:00`.
 * @param {string} a @param {string} b
 */
export function compareTimes(a, b) {
  const left = parseTimeParts(a);
  const right = parseTimeParts(b);
  if (!left || !right) throw new TypeError("compareTimes() expects HH:MM values");
  const diff = toMillis(left) - toMillis(right);
  return diff === 0 ? 0 : diff < 0 ? -1 : 1;
}
