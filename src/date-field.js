import { isDate } from "./date.js";
import { createDateAdapter } from "./intl.js";
import { createSession } from "./session.js";

/**
 * Whether the user may edit this input right now. `:disabled` is the effective
 * state: the `disabled` property misses a disabled ancestor `<fieldset>`.
 * @param {HTMLInputElement} input
 */
export function isEditable(input) {
  return !input.matches(":disabled") && !input.readOnly;
}

/**
 * Single write path for a field's custom validity. The message is the
 * submission gate and stays active for the whole correction; `aria-invalid` is
 * an announcement, not a state: it is set by a failed commit (`announce`) and
 * removed as soon as the user edits the draft again, so mid-correction typing
 * is not announced as an error. Clearing the message also clears it.
 * @param {HTMLInputElement} input
 * @param {string} [message]
 * @param {{announce?: boolean}} [options]
 */
export function setInputValidity(input, message = "", options = {}) {
  const text = message || "";
  input.setCustomValidity(text);
  if (text && options.announce) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

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
    /** Locale entry mask, or null when the format has no maskable pattern. */
    this.mask = this.adapter.mask;
    /** Whether typed digits are re-rendered with locale separators. */
    this.formatOnType = true;
    /** Last text produced by the entry formatter, used to recognize a deleted separator. */
    this._entryText = "";
    /** `maxlength` this controller generated, or null when the author owns it. @type {number | null} */
    this._generatedMaxLength = null;
    /** @type {HTMLInputElement | null} */
    this.hidden = null;
    /** Current canonical value (YYYY-MM-DD or ""). */
    this.canonical = "";
    this._dirty = false;
    this._commitId = 0;
    /** Lifetime token: torn down with the field, so no commit can start or resume. */
    this._session = createSession();
    this._originalName = input.getAttribute("name") || "";
    /** @type {MutationObserver | null} */
    this._attributeObserver = null;
    /** @type {(() => void) | null} */
    this.onAttributesChanged = null;
    /**
     * Async availability gate for a parsed date. Returning `{ ok: false }`
     * marks the target unavailable. Swappable at runtime. The commit options
     * are forwarded so the gate can honor `moveDisplay`.
     * @type {((date: string, options?: {moveDisplay?: boolean}) => Promise<{ok: boolean, message?: string}>) | null}
     */
    this.confirm = null;
    /** Canonical value behind a `defaultValue` the enhancement generated, or null. @type {string | null} */
    this._generatedDefault = null;
  }

  /** @param {string} locale */
  setLocale(locale) {
    const generated = this._generatedDefault;
    const previous = generated ? this.adapter.format(generated) : null;
    this.adapter = createDateAdapter(locale || "");
    this.mask = this.adapter.mask;
    // A generated default is localized text: reformat it so a later form reset
    // never parses the old locale's text with the new adapter. An app-changed
    // default no longer matches and stays untouched.
    if (generated && this.input.defaultValue === previous) {
      this.input.defaultValue = this.adapter.format(generated);
    }
  }

  /** @param {boolean} value */
  setFormatOnType(value) {
    this.formatOnType = value !== false;
  }

  /** Character bound of one complete locale value, masked or not. */
  get entryLength() {
    return this.adapter.entryLength;
  }

  /**
   * Bound the field to one complete locale value. Native `maxlength` stops the
   * draft from growing past a full date, which is what keeps an unparsable
   * draft bounded (`1212. 12. 12.1212…` in a plain locale). An authored
   * `maxlength` is never overridden.
   * @param {number} length
   */
  applyMaxLength(length) {
    if (this._generatedMaxLength === null && this.input.hasAttribute("maxlength")) return;
    this._generatedMaxLength = length;
    this.input.maxLength = length;
  }

  /**
   * Make the current text the reset default when the author provided none.
   * Never redefine an author-provided `input.defaultValue`: the next reset must
   * use the native default (which the app may change).
   */
  adoptDefault() {
    const input = this.input;
    if (input.getAttribute("value") != null || input.defaultValue !== "") return;
    input.defaultValue = input.value;
    this._generatedDefault = this.canonical && input.value ? this.canonical : null;
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
    return this.input.matches(":disabled");
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

  /**
   * Re-render the visible draft. Only an append is completed: the mask projects
   * what the user types at the end of the draft, and a complete value is the
   * existing parser's business (it already accepts every supported shape:
   * `2/9/2026`, `29-10-2026`, compact or ISO). An edit inside an existing value
   * is kept exactly as typed and normalized by the commit, because reformatting
   * it would move the caret away from the edit and could complete the wrong
   * date.
   * @param {InputEvent} [event]
   */
  _formatEntry(event) {
    if (!this.formatOnType || event?.isComposing) return;
    const input = this.input;
    const text = input.value;
    if (!text.trim()) {
      this._entryText = text;
      return;
    }
    const caret = input.selectionStart ?? text.length;
    const previous = this._entryText;
    const inputType = event?.inputType || "";
    // The caret sitting at the end does not mean an append: replacing the last
    // group ends there too (`29` -> `1` in `2026-10-29`). Only a draft that
    // extends the previous one is completed, so a group being replaced can
    // always be finished before it is reformatted.
    const atEnd = caret >= text.length;
    const appended = text.length > previous.length && text.startsWith(previous);
    const parsed = this.adapter.parse(text);
    if (parsed && atEnd && appended) {
      const formatted = this.adapter.format(parsed);
      this._writeEntry(formatted, formatted.length);
      return;
    }
    const mask = this.mask;
    if (!mask) return;
    const digits = mask.digits(text);
    // Erasing a separator must erase the digit it separates, otherwise the
    // separator is re-inserted immediately and Backspace appears stuck. Only a
    // deletion does that: a paste that keeps the digits but shortens the text is
    // a new draft, not a Backspace. This is the one edit inside the value the
    // mask rewrites, and it keeps the caret.
    if (
      inputType.startsWith("delete") &&
      previous &&
      mask.accepts(previous) &&
      digits === mask.digits(previous) &&
      text.length < previous.length
    ) {
      const before = mask.countDigits(text, caret);
      const drop = event?.inputType === "deleteContentForward" ? before : before - 1;
      if (drop >= 0 && drop < digits.length) {
        const next = digits.slice(0, drop) + digits.slice(drop + 1);
        this._writeEntry(mask.render(next), mask.caretIndex(next, drop));
      }
      return;
    }
    // Any other draft (letters, explicit separators, an edit inside the value)
    // stays exactly as typed; the parser reads it at commit.
    if (!atEnd || !mask.accepts(text)) {
      this._entryText = text;
      return;
    }
    this._writeEntry(mask.render(digits), mask.caretIndex(digits, mask.countDigits(text, caret)));
  }

  /** @param {string} text @param {number} [caret] */
  _writeEntry(text, caret = text.length) {
    const input = this.input;
    this._entryText = text;
    if (input.value === text) return;
    input.value = text;
    if (document.activeElement !== input) return;
    try {
      input.setSelectionRange(caret, caret);
    } catch {
      // Input types without a selection API keep the value, only the caret.
    }
  }

  /** Live text input: the raw text no longer matches the canonical value, so
   * the hidden ISO must not submit it. A text that formats back to the current
   * canonical value (e.g. re-applied by a calendar pick) keeps the ISO value
   * valid; invalidating in-flight commits first still drops stale async work.
   * @param {InputEvent} [event] */
  handleInput(event) {
    const input = this.input;
    this._formatEntry(event);
    const text = input.value.trim();
    const canonical = this.canonical ? this.adapter.format(this.canonical) : "";
    this.dirty();
    if (text === canonical) {
      this._dirty = false;
      if (this.hidden) this.hidden.value = this.canonical;
      this.setValidity("");
      return;
    }
    this._dirty = true;
    if (this.hidden) this.hidden.value = "";
    if (!text) {
      this.setValidity("");
      return;
    }
    this.setValidity(this.messages.invalidDate);
  }

  /** @param {string} [message] @param {{announce?: boolean}} [options] */
  setValidity(message = "", options = {}) {
    setInputValidity(this.input, message, options);
  }

  /**
   * Commit the visible text. Returns the parsed canonical date on success, the
   * empty string on a clear, or a falsy marker for invalid/stale commits. The
   * caller applies the canonical value so reflection and events stay central.
   * `options` is forwarded to the `confirm` gate so a revalidation can ask it
   * not to move the calendar display (source reloads must not re-home it).
   * @param {{moveDisplay?: boolean}} [options]
   * @returns {Promise<{status: "ok" | "clear" | "invalid" | "stale", value?: string, commitId: number}>}
   */
  async commit(options = {}) {
    const input = this.input;
    const commitId = ++this._commitId;
    // One controller has one lifetime, so this captured session is the
    // controller's only session: teardown aborts it for good.
    const session = this._session;
    if (session.signal.aborted) return { status: "stale", commitId };
    const text = input.value.trim();
    if (!text) {
      if (commitId !== this._commitId) return { status: "stale", commitId };
      this.setValidity("");
      return { status: "clear", value: "", commitId };
    }
    const parsed = this.adapter.parse(text);
    if (!parsed) {
      if (commitId !== this._commitId) return { status: "stale", commitId };
      if (this.hidden) this.hidden.value = "";
      this.setValidity(this.messages.invalidDate, { announce: true });
      return { status: "invalid", commitId };
    }
    if (this.confirm) {
      const result = await this.confirm(parsed, options);
      // The session is captured by this controller's own lifetime: a teardown
      // aborts it, so the pending result must not touch validity or the hidden
      // field any more.
      if (session.signal.aborted || commitId !== this._commitId) {
        return { status: "stale", commitId };
      }
      if (!result?.ok) {
        if (this.hidden) this.hidden.value = "";
        this.setValidity(result?.message || this.messages.unavailableDate, { announce: true });
        return { status: "invalid", commitId };
      }
    }
    return { status: "ok", value: parsed, commitId };
  }

  /** A coordinator must re-check this after awaiting commit(), including for
   * synchronous clear/invalid results whose Promise resumes in a microtask.
   * @param {number} commitId */
  isCommitCurrent(commitId) {
    return commitId === this._commitId;
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
    this._entryText = this.input.value;
    this.setValidity("");
  }

  /** Restore value from `input.defaultValue` (native form reset). */
  restoreDefault() {
    const text = String(this.input.defaultValue ?? "").trim();
    const parsed = isDate(text) ? text : this.adapter.parse(text);
    return parsed && isDate(parsed) ? parsed : "";
  }

  /** Remove the hidden field and attribute observer, restoring the original
   * authored `name` on the visible input. A disconnect is a teardown, not a
   * pause: in-flight commits are invalidated and later ones are refused, so a
   * reconnected picker rebuilds from the live DOM instead of resuming them. */
  teardown() {
    this.dirty();
    this._session.abort();
    this._attributeObserver?.disconnect();
    this._attributeObserver = null;
    this.input.removeAttribute("aria-invalid");
    if (this._generatedMaxLength !== null) this.input.removeAttribute("maxlength");
    this._generatedMaxLength = null;
    const hiddenName = this.hidden?.getAttribute("name") || this._originalName;
    if (hiddenName) this.input.setAttribute("name", hiddenName);
    this.hidden?.remove();
    this.hidden = null;
  }
}
