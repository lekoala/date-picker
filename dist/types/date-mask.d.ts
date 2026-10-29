export type DateMaskPart = "day" | "month" | "year";
export type DateMaskOptions = {
    order: DateMaskPart[];
    separator: string;
    toLocalDigit: (digit: string) => string;
    toAsciiText: (text: string) => string;
};
/**
 * @typedef {"day" | "month" | "year"} DateMaskPart
 * @typedef {{
 *   order: DateMaskPart[],
 *   separator: string,
 *   toLocalDigit: (digit: string) => string,
 *   toAsciiText: (text: string) => string,
 * }} DateMaskOptions
 */
/**
 * Locale numeric date mask: a projection of a digit string onto the pattern
 * `Intl` already produces. It is deliberately not an editing model:
 *
 * - it never decides whether a date exists (`31/02/2026` stays typable);
 * - it only re-renders drafts it could itself have produced, so a partial draft
 *   with explicit separators (`2/9/2026`) is never redistributed;
 * - it is pure (no DOM), so the caret math is testable without a browser.
 */
export declare class DateMask {
    widths: (2 | 4)[];
    separator: string;
    total: number;
    _toLocalDigit: (digit: string) => string;
    _toAsciiText: (text: string) => string;
    /** @param {DateMaskOptions} options */
    constructor(options: DateMaskOptions);
    /**
     * One ASCII digit, or "" for any other code point.
     * @param {string} char
     * @returns {string}
     */
    _asciiDigit(char: string): string;
    /** @param {string} char */
    isDigit(char: string): boolean;
    /** @param {string} text */
    digits(text: string): string;
    /** @param {string} text @param {number} index */
    countDigits(text: string, index: number): number;
    /** @param {string} chunk @returns {string} */
    _localize(chunk: string): string;
    /**
     * Render the digit string with the locale separator. The separator is only
     * inserted between groups that actually have digits, so typing a separator
     * yourself can never produce a doubled one.
     * @param {string} digits
     * @returns {string}
     */
    render(digits: string): string;
    /**
     * Caret position (in the rendered text) after `digitCount` digits: the
     * rendering of the prefix is exactly the text up to that point.
     * @param {string} digits
     * @param {number} digitCount
     */
    caretIndex(digits: string, digitCount: number): number;
    /** @param {number} count */
    _groupEnd(count: number): boolean;
    /**
     * Whether the draft is a shape this mask could have produced for its own
     * digits: digits and separators only, every separator sitting exactly at a
     * group boundary, and never more digits than the pattern holds. A draft with
     * an extra digit or a user-typed separator inside a group (`2/9/2026`,
     * `2 9 2026`) fails, which keeps it for the parser instead of silently
     * dropping or reordering its digits. Whitespace is a separator like any
     * other, not something to skip: dropping it would move the digits that
     * follow into the wrong component.
     * @param {string} text
     */
    accepts(text: string): boolean;
}
/** @param {DateMaskOptions} options */
export declare function createDateMask(options: DateMaskOptions): DateMask;
//# sourceMappingURL=date-mask.d.ts.map