const ASCII_DIGIT = /^[0-9]$/;
const DATE_SEPARATORS = new Set(["/", "-", ".", "\u00a0"]);
const BIDI = /[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/u;

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
export class DateMask {
  /** @param {DateMaskOptions} options */
  constructor(options) {
    this.widths = options.order.map((part) => (part === "year" ? 4 : 2));
    this.separator = options.separator;
    this.total = this.widths.reduce((sum, width) => sum + width, 0);
    this._toLocalDigit = options.toLocalDigit;
    this._toAsciiText = options.toAsciiText;
  }

  /**
   * One ASCII digit, or "" for any other code point.
   * @param {string} char
   * @returns {string}
   */
  _asciiDigit(char) {
    if (ASCII_DIGIT.test(char)) return char;
    const mapped = this._toAsciiText(char);
    return ASCII_DIGIT.test(mapped) ? mapped : "";
  }

  /** @param {string} char */
  isDigit(char) {
    return this._asciiDigit(char) !== "";
  }

  /** @param {string} text */
  digits(text) {
    let out = "";
    for (const char of String(text || "")) {
      const digit = this._asciiDigit(char);
      if (digit) out += digit;
    }
    return out;
  }

  /** @param {string} text @param {number} index */
  countDigits(text, index) {
    return this.digits(String(text || "").slice(0, Math.max(0, index))).length;
  }

  /** @param {string} chunk @returns {string} */
  _localize(chunk) {
    let out = "";
    for (const digit of chunk) out += this._toLocalDigit(digit);
    return out;
  }

  /**
   * Render the digit string with the locale separator. The separator is only
   * inserted between groups that actually have digits, so typing a separator
   * yourself can never produce a doubled one.
   * @param {string} digits
   * @returns {string}
   */
  render(digits) {
    const list = Array.from(String(digits || "").slice(0, this.total));
    let out = "";
    let index = 0;
    for (let group = 0; group < this.widths.length; group++) {
      const width = this.widths[group];
      const chunk = list.slice(index, index + width).join("");
      out += this._localize(chunk);
      index += width;
      if (group < this.widths.length - 1 && chunk.length === width && index < list.length) {
        out += this.separator;
      }
    }
    return out;
  }

  /**
   * Caret position (in the rendered text) after `digitCount` digits: the
   * rendering of the prefix is exactly the text up to that point.
   * @param {string} digits
   * @param {number} digitCount
   */
  caretIndex(digits, digitCount) {
    const count = Math.max(0, Math.min(digitCount, this.total));
    return this.render(String(digits || "").slice(0, count)).length;
  }

  /** @param {number} count */
  _groupEnd(count) {
    let total = 0;
    for (const width of this.widths) {
      total += width;
      if (count === total) return true;
    }
    return false;
  }

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
  accepts(text) {
    /** @type {("d" | "s")[]} */
    const chars = [];
    for (const char of String(text || "")) {
      if (this.isDigit(char)) chars.push("d");
      else if (BIDI.test(char)) continue;
      else if (DATE_SEPARATORS.has(char) || /\s/u.test(char) || this.separator.includes(char)) {
        chars.push("s");
      } else return false;
    }
    let count = 0;
    for (let index = 0; index < chars.length; index++) {
      if (chars[index] === "s") {
        if (count === 0 || !this._groupEnd(count)) return false;
        if (chars[index + 1] === "s") return false;
        continue;
      }
      count++;
      if (count > this.total) return false;
    }
    return true;
  }
}

/** @param {DateMaskOptions} options */
export function createDateMask(options) {
  return new DateMask(options);
}
