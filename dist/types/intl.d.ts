/** @param {string} [locale] */
export declare function resolveLocale(locale?: string): string;
/** @param {string} value @param {string} [locale] */
export declare function formatLongDate(value: string, locale?: string): string;
/** @param {string} value @param {string} [locale] */
export declare function formatMonthYear(value: string, locale?: string): string;
/**
 * Locale order of the visible month/year controls, derived from `Intl` so no
 * `showMonthAfterYear`-style option is needed. Year-like parts cover the
 * `relatedYear` / `yearName` variants some calendars expose; anything
 * unrecognized falls back to month-then-year. This is independent of `dir`:
 * the locale decides the linguistic order, direction only mirrors the layout.
 * @param {string} [locale] @returns {["month", "year"] | ["year", "month"]}
 */
export declare function monthYearOrder(locale?: string): ["month", "year"] | ["year", "month"];
/** @param {string} [locale] @param {"long"|"short"} [style] */
export declare function monthNames(locale?: string, style?: "long" | "short"): string[];
/**
 * @param {string} [locale]
 * @param {number} [firstDay]
 * @param {"long"|"short"|"narrow"} [style]
 */
export declare function weekdayNames(locale?: string, firstDay?: number, style?: "long" | "short" | "narrow"): string[];
/**
 * Localized, editable numeric date adapter. The canonical value remains YYYY-MM-DD.
 *
 * Parsing stays tolerant on purpose: day and month accept one or two digits,
 * any of `"/"`, `"-"`, `"."` or a blank run separates the groups, and an
 * eight-digit compact entry is split using the locale's own widths. Component
 * order is never guessed: `10/29/2026` is invalid in `fr-BE`.
 *
 * `mask` is the entry mask for patterns that are exactly
 * `group separator group separator group` with a shared, simple separator.
 * Locales whose numeric format embeds spaces or a suffix (for example
 * `ko-KR` → `2026. 09. 06.`) keep plain typing: no `mask`, no auto separators.
 * @param {string} [locale]
 */
export declare function createDateAdapter(locale?: string): {
    locale: string;
    placeholder: string;
    /** Length of one complete formatted value, used as the field's `maxlength`. */
    entryLength: number;
    /** Entry mask for this locale, or null when the format is not maskable. */
    mask: import("./date-mask.js").DateMask | null;
    /** @param {string} value */
    format(value: string): string;
    /** @param {string} text @returns {string} */
    parse(text: string): string;
};
/** @param {string} value */
export declare function dateParts(value: string): {
    year: number;
    month: number;
    day: number;
} | null;
//# sourceMappingURL=intl.d.ts.map