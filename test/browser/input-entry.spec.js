import { expect, test } from "@playwright/test";

/** @param {import("@playwright/test").Page} page @param {string} id */
async function fieldState(page, id) {
  return page.evaluate((inputId) => {
    const input = /** @type {HTMLInputElement} */ (document.getElementById(inputId));
    const picker = /** @type {HTMLElement & {value: string}} */ (input.closest("date-picker"));
    return {
      value: input.value,
      valid: input.checkValidity(),
      message: input.validationMessage,
      ariaInvalid: input.getAttribute("aria-invalid"),
      hiddens: Object.fromEntries(
        [...picker.querySelectorAll('input[type="hidden"]')].map((hidden) => [
          /** @type {HTMLInputElement} */ (hidden).name,
          /** @type {HTMLInputElement} */ (hidden).value,
        ]),
      ),
      picker: picker.value,
    };
  }, id);
}

/** @param {import("@playwright/test").Page} page @param {string} id */
async function hidePicker(page, id) {
  await page.evaluate((pickerId) => {
    /** @type {HTMLElement & {hide: () => void}} */ (document.getElementById(pickerId)).hide();
  }, id);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/input-entry.html");
});

test("typing digits inserts locale separators and commits the ISO value on blur", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("29102026");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
  // The draft is not validated yet, so it must not submit the previous value.
  expect((await fieldState(page, "entry-date")).hiddens.date).toBe("");

  await page.locator("#entry-date").blur();
  const state = await fieldState(page, "entry-date");
  expect(state.value).toBe("29/10/2026");
  expect(state.hiddens.date).toBe("2026-10-29");
  expect(state.picker).toBe("2026-10-29");
  expect(state.ariaInvalid).toBeNull();
});

test("an explicit-separator entry is normalized by the existing parser", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("2/9/2026");
  await expect(page.locator("#entry-date")).toHaveValue("02/09/2026");
  await page.locator("#entry-date").blur();
  expect((await fieldState(page, "entry-date")).picker).toBe("2026-09-02");
});

test("backspace at the end keeps the locale pattern", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("2910");
  await expect(page.locator("#entry-date")).toHaveValue("29/10");
  await page.keyboard.press("Backspace");
  await expect(page.locator("#entry-date")).toHaveValue("29/1");
});

test("editing inside the draft keeps the caret near the edit", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("29102026");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
  await page.evaluate(() => {
    /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).setSelectionRange(3, 3);
  });
  await page.keyboard.press("Backspace");
  await expect(page.locator("#entry-date")).toHaveValue("21/02/026");
  const caret = await page.evaluate(
    () => /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).selectionStart,
  );
  expect(caret).toBe(1);
});

test("replacing a group inside a complete value can be finished", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("29102026");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
  await page.evaluate(() => {
    /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).setSelectionRange(0, 2);
  });
  // The first digit must not be completed into `01/10/2026` with the caret at
  // the end: the second digit would then be refused by the field bound and the
  // day would silently commit as `1`.
  await page.keyboard.type("15");
  await expect(page.locator("#entry-date")).toHaveValue("15/10/2026");
  const caret = await page.evaluate(
    () => /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).selectionStart,
  );
  expect(caret).toBe(2);

  await page.locator("#entry-date").blur();
  const state = await fieldState(page, "entry-date");
  expect(state.value).toBe("15/10/2026");
  expect(state.hiddens.date).toBe("2026-10-15");
  expect(state.picker).toBe("2026-10-15");
});

test("a digit typed over a mid-value group is not redistributed", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("29102026");
  await page.evaluate(() => {
    /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).setSelectionRange(3, 5);
  });
  // A single-digit month keeps its own group instead of being flattened with
  // the next group's digits (`29/02/026`).
  await page.keyboard.type("01");
  await expect(page.locator("#entry-date")).toHaveValue("29/01/2026");
  await page.locator("#entry-date").blur();
  expect((await fieldState(page, "entry-date")).picker).toBe("2026-01-29");
});

test("replacing the last group of a complete value can be finished", async ({ page }) => {
  // The replaced group ends at the end of the text, so the caret position alone
  // cannot tell this edit from an append.
  await expect(page.locator("#iso-entry-date")).toHaveValue("2026-10-29");
  await page.focus("#iso-entry-date");
  await page.evaluate(() => {
    /** @type {HTMLInputElement} */ (document.getElementById("iso-entry-date")).setSelectionRange(8, 10);
  });
  await page.keyboard.type("15");
  await expect(page.locator("#iso-entry-date")).toHaveValue("2026-10-15");
  await page.locator("#iso-entry-date").blur();
  const state = await fieldState(page, "iso-entry-date");
  expect(state.hiddens["iso-entry"]).toBe("2026-10-15");
  expect(state.picker).toBe("2026-10-15");
});

test("the field is bounded to one complete value", async ({ page }) => {
  await expect(page.locator("#entry-date")).toHaveAttribute("maxlength", "10");
  // An authored maxlength is never overridden.
  await expect(page.locator("#us-date")).toHaveAttribute("maxlength", "12");

  await page.focus("#entry-date");
  await page.keyboard.type("291020269");
  // The extra digit never enters the field, so the value stays complete.
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
  await page.locator("#entry-date").blur();
  const state = await fieldState(page, "entry-date");
  expect(state.valid).toBe(true);
  expect(state.picker).toBe("2026-10-29");
});

test("the generated maxlength follows the locale and is removed on disconnect", async ({ page }) => {
  const state = await page.evaluate(() => {
    const picker = /** @type {HTMLElement & {locale: string}} */ (document.getElementById("entry-picker"));
    const input = /** @type {HTMLInputElement} */ (document.getElementById("entry-date"));
    const initial = input.getAttribute("maxlength");
    picker.locale = "ar-EG";
    const arabic = input.getAttribute("maxlength");
    picker.locale = "fr-BE";
    picker.remove();
    const detached = input.getAttribute("maxlength");
    document.body.append(picker);
    return { initial, arabic, detached, reconnected: input.getAttribute("maxlength") };
  });
  expect(state.initial).toBe("10");
  expect(state.arabic).toBe("12");
  expect(state.detached).toBeNull();
  expect(state.reconnected).toBe("10");
});

test("a non-maskable format is still bounded to its formatted length", async ({ page }) => {
  await expect(page.locator("#korean-date")).toHaveAttribute("maxlength", "13");
  // No mask means no numeric keyboard hint either.
  await expect(page.locator("#korean-date")).not.toHaveAttribute("inputmode", /.+/);

  await page.focus("#korean-date");
  await page.keyboard.type("1212.12.121212");
  await expect(page.locator("#korean-date")).toHaveValue("1212.12.12121");
});

test("inserting a digit inside a complete date is refused by the field bound", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("29102026");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
  await page.evaluate(() => {
    /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).setSelectionRange(8, 8);
  });
  await page.keyboard.type("9");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
});

test("pasted drafts with other separators or without separators are normalized", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.insertText("29-10-2026");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");

  await page.fill("#entry-date", "");
  await page.focus("#entry-date");
  await page.keyboard.insertText("29102026");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");

  // A complete ISO value is understood by the existing parser and displayed in
  // the locale format.
  await page.fill("#entry-date", "");
  await page.focus("#entry-date");
  await page.keyboard.insertText("2026-10-29");
  await expect(page.locator("#entry-date")).toHaveValue("29/10/2026");
});

test("a partial draft with explicit separators is kept as typed for the parser", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("2/9/20");
  await expect(page.locator("#entry-date")).toHaveValue("2/9/20");
  await page.keyboard.type("26");
  // Once complete, the parser normalizes the draft.
  await expect(page.locator("#entry-date")).toHaveValue("02/09/2026");
});

test("an explicit space inside a group is kept for the parser", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("2 9");
  // The space is not dropped: dropping it would move `9` into the day group
  // and the rest of the digits would end up in the wrong components.
  await expect(page.locator("#entry-date")).toHaveValue("2 9");
  await page.keyboard.type(" 2026");
  await expect(page.locator("#entry-date")).toHaveValue("02/09/2026");
  await page.locator("#entry-date").blur();
  expect((await fieldState(page, "entry-date")).picker).toBe("2026-09-02");
});

test("a paste is never read as a separator deletion", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("31022026");
  await expect(page.locator("#entry-date")).toHaveValue("31/02/2026");
  await page.evaluate(() => {
    /** @type {HTMLInputElement} */ (document.getElementById("entry-date")).setSelectionRange(0, 10);
  });
  // Same digits in a shorter text: only a real deletion may erase a digit here.
  await page.keyboard.insertText("31022026");
  await expect(page.locator("#entry-date")).toHaveValue("31/02/2026");
  await page.locator("#entry-date").blur();
  const state = await fieldState(page, "entry-date");
  expect(state.hiddens.date).toBe("");
  expect(state.message).toBe("Enter a valid date");
});

test("an impossible date is kept, announced after commit and never submitted", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("31022026");
  await expect(page.locator("#entry-date")).toHaveValue("31/02/2026");

  const draft = await fieldState(page, "entry-date");
  expect(draft.valid).toBe(false);
  // Typing is not an announcement; the error is announced once committed.
  expect(draft.ariaInvalid).toBeNull();

  await page.locator("#entry-date").blur();
  const invalid = await fieldState(page, "entry-date");
  expect(invalid.value).toBe("31/02/2026");
  expect(invalid.hiddens.date).toBe("");
  expect(invalid.message).toBe("Enter a valid date");
  expect(invalid.ariaInvalid).toBe("true");

  await hidePicker(page, "entry-picker");
  await page.click("#entry-submit");
  await expect(page.locator("#entry-out")).toHaveText("");

  await page.fill("#entry-date", "01032026");
  // Editing clears the announcement; native invalidity keeps blocking the form
  // until the correction is committed.
  const correcting = await fieldState(page, "entry-date");
  expect(correcting.ariaInvalid).toBeNull();
  expect(correcting.valid).toBe(false);

  await page.locator("#entry-date").blur();
  const fixed = await fieldState(page, "entry-date");
  expect(fixed).toMatchObject({
    value: "01/03/2026",
    valid: true,
    ariaInvalid: null,
    hiddens: { date: "2026-03-01" },
    picker: "2026-03-01",
  });
  await hidePicker(page, "entry-picker");
  await page.click("#entry-submit");
  await expect(page.locator("#entry-out")).toHaveText("date=2026-03-01");
});

test("out-of-bounds and unavailable dates report distinct messages", async ({ page }) => {
  await page.focus("#bounds-date");
  await page.keyboard.type("05092026");
  await page.locator("#bounds-date").blur();
  const bounds = await fieldState(page, "bounds-date");
  expect(bounds.value).toBe("05/09/2026");
  expect(bounds.message).toBe("Date outside the allowed range");
  expect(bounds.hiddens.bounds).toBe("");

  await page.focus("#disabled-date");
  await page.keyboard.type("14092026");
  await page.locator("#disabled-date").blur();
  const closed = await fieldState(page, "disabled-date");
  expect(closed.value).toBe("14/09/2026");
  expect(closed.message).toBe("This date is unavailable");
  expect(closed.hiddens.closed).toBe("");
});

test("the component order comes from the locale, not from the input", async ({ page }) => {
  await page.focus("#us-date");
  await page.keyboard.type("10292026");
  await expect(page.locator("#us-date")).toHaveValue("10/29/2026");
  await page.locator("#us-date").blur();
  expect((await fieldState(page, "us-date")).picker).toBe("2026-10-29");

  // The other order is not guessed in en-US either.
  await page.fill("#us-date", "29102026");
  await page.locator("#us-date").blur();
  expect((await fieldState(page, "us-date")).valid).toBe(false);
});

test("format-on-type=false keeps the draft untouched but still parses it", async ({ page }) => {
  await page.focus("#plain-date");
  await page.keyboard.type("29102026");
  await expect(page.locator("#plain-date")).toHaveValue("29102026");
  await page.locator("#plain-date").blur();
  const state = await fieldState(page, "plain-date");
  expect(state.value).toBe("29/10/2026");
  expect(state.picker).toBe("2026-10-29");
});

test("inputmode is added for numeric formats and never overrides the author", async ({ page }) => {
  await expect(page.locator("#entry-date")).toHaveAttribute("inputmode", "numeric");
  await expect(page.locator("#us-date")).toHaveAttribute("inputmode", "numeric");
  await expect(page.locator("#plain-date")).toHaveAttribute("inputmode", "numeric");
  await expect(page.locator("#custom-mode-date")).toHaveAttribute("inputmode", "search");
});

test("range bounds are masked independently and keep the order error", async ({ page }) => {
  await page.focus("#entry-start");
  await page.keyboard.type("25092026");
  await page.locator("#entry-start").blur();
  const start = await fieldState(page, "entry-start");
  expect(start.value).toBe("25/09/2026");
  expect(start.hiddens.start).toBe("2026-09-25");

  await page.focus("#entry-end");
  await page.keyboard.type("10092026");
  await page.locator("#entry-end").blur();
  const end = await fieldState(page, "entry-end");
  expect(end.value).toBe("10/09/2026");
  expect(end.hiddens.end).toBe("2026-09-10");
  expect(end.message).toBe("End must be on or after start");
  expect(end.ariaInvalid).toBe("true");
});

test("a programmatic value supersedes the invalid draft and clears the announced error", async ({ page }) => {
  await page.focus("#entry-date");
  await page.keyboard.type("31022026");
  await page.locator("#entry-date").blur();
  expect((await fieldState(page, "entry-date")).ariaInvalid).toBe("true");

  await page.evaluate(() => {
    /** @type {HTMLElement & {value: string}} */ (document.getElementById("entry-picker")).value =
      "2026-09-20";
  });
  const state = await fieldState(page, "entry-date");
  expect(state.value).toBe("20/09/2026");
  expect(state.hiddens.date).toBe("2026-09-20");
  expect(state.ariaInvalid).toBeNull();
});

test("an IME composition is never rewritten mid-flight", async ({ page }) => {
  const value = await page.evaluate(() => {
    const input = /** @type {HTMLInputElement} */ (document.getElementById("ime-date"));
    input.focus();
    input.value = "291";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, isComposing: true }));
    const composing = input.value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    return { composing, settled: input.value };
  });
  expect(value).toEqual({ composing: "291", settled: "29/1" });
});

test("letters stay typable and deletable in an invalid draft", async ({ page }) => {
  await page.focus("#ime-date");
  await page.keyboard.type("garbage");
  await expect(page.locator("#ime-date")).toHaveValue("garbage");
  await page.keyboard.press("Backspace");
  await expect(page.locator("#ime-date")).toHaveValue("garbag");
});
