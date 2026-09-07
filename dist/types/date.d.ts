/** @param {number} year */
export declare function isLeapYear(year: number): boolean;
/** @param {number} year @param {number} month */
export declare function daysInMonth(year: number, month: number): 28 | 29 | 30 | 31;
/**
 * Parse one canonical civil date.
 * @param {string} value
 * @returns {{year:number, month:number, day:number} | null}
 */
export declare function parseDate(value: string): {
    year: number;
    month: number;
    day: number;
} | null;
/** @param {string} value */
export declare function isDate(value: string): boolean;
/**
 * Normalize YYYY-MM or YYYY-MM-DD to YYYY-MM.
 * @param {string} value
 * @returns {string}
 */
export declare function monthKey(value: string): string;
/** @param {number} year @param {number} month @param {number} day */
export declare function toISODate(year: number, month: number, day: number): string;
/** @param {string} value */
export declare function toIntlDate(value: string): Date;
/** @param {string} a @param {string} b */
export declare function compareDates(a: string, b: string): -1 | 0 | 1;
/** @param {string} value @param {number} amount */
export declare function addDays(value: string, amount: number): string;
/** @param {string} value @param {number} amount */
export declare function addMonths(value: string, amount: number): string;
/** @param {string} value @param {number} amount */
export declare function addYears(value: string, amount: number): string;
/** @param {string} month @param {number} amount */
export declare function shiftMonth(month: string, amount: number): string;
/** @param {string} value */
export declare function startOfMonth(value: string): string;
/** @param {string} value */
export declare function endOfMonth(value: string): string;
/** 0=Sunday ... 6=Saturday. @param {string} value */
export declare function dayOfWeek(value: string): number;
/** @param {string} value @param {number} firstDay */
export declare function startOfWeek(value: string, firstDay?: number): string;
/** @param {string} value @param {number} firstDay */
export declare function endOfWeek(value: string, firstDay?: number): string;
/**
 * True civil weeks covering the anchor month: 4..6 full rows, never padded.
 * @param {string} value YYYY-MM or YYYY-MM-DD
 * @param {{firstDay?: number}} [options]
 */
export declare function getMonthWeeks(value: string, options?: {
    firstDay?: number;
}): string[][];
/** @param {string} value @param {string} [min] @param {string} [max] */
export declare function clampDate(value: string, min?: string, max?: string): string;
/** Local civil date; no timezone conversion of the selected date model. */
export declare function todayISO(): string;
/** ISO-8601 week number. @param {string} value */
export declare function isoWeekNumber(value: string): number;
//# sourceMappingURL=date.d.ts.map