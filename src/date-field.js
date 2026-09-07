import { isDate } from "./date.js";
import { createDateAdapter } from "./intl.js";

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
export class DateFieldController {
  /**
   * @param {HTMLInputElement} input
   * @param {{messages?: Record<string, string>, locale?: string}} [options]
   */
  constructor(input, options = {}) {
    this.input = input;
    this.messages = options.messages || {};
    this.adapter = createDateAdapter(options.locale || "");
    /** @type {HTMLInputElement | null} */
    this.hidden = null;
    /** Current canonical value (YYYY-MM-DD or ""). */
    this.canonical = "";
    this._dirty = false;
    this._commitId = 0;
    this._originalName = input.getAttribute("name") || "";
    /** @type {MutationObserver | null} */
    this._attributeObserver = null;
    /** @type {(() => void) | null} */
    this.onAttributesChanged = null;
    /**
     * Async availability gate for a parsed date. Returning `{ ok: false }`
     * marks the target unavailable. Swappable at runtime.
     * @type {((date: string) => Promise<{ok: boolean, message?: string}>) | null}
     */
    this.confirm = null;
  }

  /** @param {string} locale */
  setLocale(locale) {
    this.adapter = createDateAdapter(locale || "");
  }

  /** @param {Record<string, string>} messages */
  setMessages(messages) {
    this.messages = messages || {};
  }

  /** @param {string} value */
  format(value) {
    return this.adapter.format(value);
  }

  /** @param {string} text */
  parse(text) {
    return this.adapter.parse(text);
  }

  get placeholder() {
    return this.adapter.placeholder;
  }

  get isDisabled() {
    return this.input.disabled;
  }

  get isReadOnly() {
    return this.input.readOnly;
  }

  /** Create the hidden canonical field for an authored `name` and observe the
   * input for dynamic name/form/disabled changes. */
  setupFormValue() {
    const input = this.input;
    this._originalName = input.getAttribute("name") || "";
    this._attributeObserver = new MutationObserver(() => this.onAttributesChanged?.());
    this._attributeObserver.observe(input, {
      attributes: true,
      attributeFilter: ["disabled", "readonly", "name", "form"],
    });
    this.syncInputState();
  }

  /** Sync the hidden field with the current dynamic attributes. */
  syncInputState() {
    const input = this.input;
    const name = input.getAttribute("name") || "";
    if (name) {
      if (!this.hidden) {
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.value = this.canonical;
        input.insertAdjacentElement("afterend", hidden);
        this.hidden = hidden;
      }
      if (this.hidden) this.hidden.name = name;
      input.removeAttribute("name");
    }
    if (this.hidden) {
      if (input.hasAttribute("form")) this.hidden.setAttribute("form", input.getAttribute("form") || "");
      else this.hidden.removeAttribute("form");
      this.hidden.disabled = input.disabled;
    }
  }

  /** Invalidate any pending (possibly in-flight) commit. */
  dirty() {
    this._commitId++;
  }

  /** Whether the user edited the visible text since the last application. */
  get isDirty() {
    return this._dirty;
  }

  /** Live text input: the raw text no longer matches the canonical value, so
   * the hidden ISO must not submit it. */
  handleInput() {
    const input = this.input;
    this._dirty = true;
    this.dirty();
    if (this.hidden) this.hidden.value = "";
    const text = input.value.trim();
    if (!text) {
      input.setCustomValidity("");
      return;
    }
    const canonical = this.canonical ? this.adapter.format(this.canonical) : "";
    input.setCustomValidity(text === canonical ? "" : this.messages.invalidDate);
  }

  /**
   * Commit the visible text. Returns the parsed canonical date on success, the
   * empty string on a clear, or a falsy marker for invalid/stale commits. The
   * caller applies the canonical value so reflection and events stay central.
   * @returns {Promise<{status: "ok" | "clear" | "invalid" | "stale", value?: string}>}
   */
  async commit() {
    const input = this.input;
    const commitId = ++this._commitId;
    const text = input.value.trim();
    if (!text) {
      if (commitId !== this._commitId) return { status: "stale" };
      input.setCustomValidity("");
      return { status: "clear", value: "" };
    }
    const parsed = this.adapter.parse(text);
    if (!parsed) {
      if (commitId !== this._commitId) return { status: "stale" };
      if (this.hidden) this.hidden.value = "";
      input.setCustomValidity(this.messages.invalidDate);
      return { status: "invalid" };
    }
    if (this.confirm) {
      const result = await this.confirm(parsed);
      if (commitId !== this._commitId) return { status: "stale" };
      if (!result?.ok) {
        if (this.hidden) this.hidden.value = "";
        input.setCustomValidity(result?.message || this.messages.unavailableDate);
        return { status: "invalid" };
      }
    }
    return { status: "ok", value: parsed };
  }

  /**
   * @param {string} value
   * @param {{format?: boolean}} [options]
   */
  setCanonical(value, options = {}) {
    const next = value || "";
    if (next && !isDate(next)) throw new TypeError(`Invalid date-picker value: ${next}`);
    // A programmatic/coordinator application supersedes any in-flight text
    // commit, so an older pending result can never overwrite a newer value.
    this.dirty();
    this.canonical = next;
    this._dirty = false;
    if (this.hidden) this.hidden.value = next;
    if (options.format !== false) this.input.value = next ? this.adapter.format(next) : "";
    this.input.setCustomValidity("");
  }

  /** Restore value from `input.defaultValue` (native form reset). */
  restoreDefault() {
    const text = String(this.input.defaultValue ?? "").trim();
    const parsed = isDate(text) ? text : this.adapter.parse(text);
    return parsed && isDate(parsed) ? parsed : "";
  }

  /** Remove the hidden field and attribute observer, restoring the original
   * authored `name` on the visible input. */
  teardown() {
    this._attributeObserver?.disconnect();
    this._attributeObserver = null;
    const hiddenName = this.hidden?.getAttribute("name") || this._originalName;
    if (hiddenName) this.input.setAttribute("name", hiddenName);
    this.hidden?.remove();
    this.hidden = null;
  }
}
