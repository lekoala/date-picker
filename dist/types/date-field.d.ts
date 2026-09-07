/**
 * Owns a single editable form field inside a picker: the visible input, its
 * hidden canonical ISO field, the Intl adapter and the text commit pipeline
 * (parsing, availability gate, stale-response protection).
 *
 * It deliberately knows nothing about calendars, popups or ranges. Remote
 * availability is injected as an async `confirm(date)` callback and the
 * committed canonical value is applied by the coordinator, so all canonical
 * reflection and events stay at the picker level.
 */
export declare class DateFieldController {
    input: HTMLInputElement;
    messages: Record<string, string>;
    adapter: {
        locale: string;
        placeholder: string;
        format(value: string): string;
        parse(text: string): string;
    };
    /** @type {HTMLInputElement | null} */
    hidden: HTMLInputElement | null;
    /** Current canonical value (YYYY-MM-DD or ""). */
    canonical: string;
    _dirty: boolean;
    _commitId: number;
    _originalName: string;
    /** @type {MutationObserver | null} */
    _attributeObserver: MutationObserver | null;
    /** @type {(() => void) | null} */
    onAttributesChanged: (() => void) | null;
    /**
     * Async availability gate for a parsed date. Returning `{ ok: false }`
     * marks the target unavailable. Swappable at runtime.
     * @type {((date: string) => Promise<{ok: boolean, message?: string}>) | null}
     */
    confirm: ((date: string) => Promise<{
        ok: boolean;
        message?: string;
    }>) | null;
    /**
     * @param {HTMLInputElement} input
     * @param {{messages?: Record<string, string>, locale?: string}} [options]
     */
    constructor(input: HTMLInputElement, options?: {
        messages?: Record<string, string>;
        locale?: string;
    });
    /** @param {string} locale */
    setLocale(locale: string): void;
    /** @param {Record<string, string>} messages */
    setMessages(messages: Record<string, string>): void;
    /** @param {string} value */
    format(value: string): string;
    /** @param {string} text */
    parse(text: string): string;
    get placeholder(): string;
    get isDisabled(): boolean;
    get isReadOnly(): boolean;
    /** Create the hidden canonical field for an authored `name` and observe the
     * input for dynamic name/form/disabled changes. */
    setupFormValue(): void;
    /** Sync the hidden field with the current dynamic attributes. */
    syncInputState(): void;
    /** Invalidate any pending (possibly in-flight) commit. */
    dirty(): void;
    /** Whether the user edited the visible text since the last application. */
    get isDirty(): boolean;
    /** Live text input: the raw text no longer matches the canonical value, so
     * the hidden ISO must not submit it. */
    handleInput(): void;
    /**
     * Commit the visible text. Returns the parsed canonical date on success, the
     * empty string on a clear, or a falsy marker for invalid/stale commits. The
     * caller applies the canonical value so reflection and events stay central.
     * @returns {Promise<{status: "ok" | "clear" | "invalid" | "stale", value?: string}>}
     */
    commit(): Promise<{
        status: "ok" | "clear" | "invalid" | "stale";
        value?: string;
    }>;
    /**
     * @param {string} value
     * @param {{format?: boolean}} [options]
     */
    setCanonical(value: string, options?: {
        format?: boolean;
    }): void;
    /** Restore value from `input.defaultValue` (native form reset). */
    restoreDefault(): string;
    /** Remove the hidden field and attribute observer, restoring the original
     * authored `name` on the visible input. */
    teardown(): void;
}
//# sourceMappingURL=date-field.d.ts.map