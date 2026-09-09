/** Civil time check for canonical `input[type=time]` values. @param {string} value */
export declare function isTime(value: string): boolean;
/**
 * Compare two canonical time values. `09:30` equals `09:30:00`.
 * @param {string} a @param {string} b
 */
export declare function compareTimes(a: string, b: string): -1 | 0 | 1;
//# sourceMappingURL=time.d.ts.map