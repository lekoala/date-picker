import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("range mode exposes a strict range API and keeps value/input unavailable", async ({ page }) => {
  const state = await page.evaluate(() => {
    const picker = document.getElementById("stay-picker");
    const single = document.getElementById("simple-picker");
    const boom = (fn) => {
      try {
        fn();
        return false;
      } catch (error) {
        return error instanceof TypeError;
      }
    };
    return {
      range: picker.range,
      value: picker.value,
      input: picker.input,
      singleValue: single.value,
      valueThrows: boom(() => {
        picker.value = "2026-09-10";
      }),
      singleRangeThrows: boom(() => {
        single.range = { start: "2026-09-10", end: "2026-09-15" };
      }),
      invertedRangeThrows: boom(() => {
        picker.range = { start: "2026-09-20", end: "2026-09-15" };
      }),
    };
  });
  expect(state.range).toEqual({ start: "", end: "" });
  expect(state.value).toBeUndefined();
  expect(state.input).toBeUndefined();
  expect(state.singleValue).toBe("2026-09-06");
  expect(state.valueThrows).toBe(true);
  expect(state.singleRangeThrows).toBe(true);
  expect(state.invertedRangeThrows).toBe(true);
});

test("opening from start picks start, stays open for end and closes on completion", async ({ page }) => {
  await page.locator("#stay-start").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();

  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", true);
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );

  await page.click('#stay-picker .dp-day[data-date="2026-09-15"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  await expect(page.locator("#stay-end")).toBeFocused();
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-12"]')).toHaveAttribute(
    "data-in-range",
    "true",
  );
  await expect(page.locator('#stay-picker input[type="hidden"][name="arrival"]')).toHaveValue("2026-09-10");
  await expect(page.locator('#stay-picker input[type="hidden"][name="departure"]')).toHaveValue("2026-09-15");
});

test("the shared button targets the last active bound, else start", async ({ page }) => {
  await page.click("#stay-picker .dp-picker-button");
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("");
});

test("opening from end refuses a date before start and closes on a valid end", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-picker").range = { start: "2026-09-10", end: "2026-09-15" };
  });
  await page.locator("#stay-end").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();

  await page.click('#stay-picker .dp-day[data-date="2026-09-05"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", true);
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");

  await page.click('#stay-picker .dp-day[data-date="2026-09-12"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-end")).toHaveValue("12/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
});

test("picker.range assigns atomically with a single rangechange", async ({ page }) => {
  await page.evaluate(() => {
    window.__events = [];
    window.__atomic = null;
    const picker = document.getElementById("stay-picker");
    picker.addEventListener("rangechange", () => {
      window.__events.push(window.__events.length);
      window.__atomic = {
        visibleStart: document.getElementById("stay-start").value,
        visibleEnd: document.getElementById("stay-end").value,
        hiddenStart: document.querySelector('#stay-picker input[type="hidden"][name="arrival"]').value,
        hiddenEnd: document.querySelector('#stay-picker input[type="hidden"][name="departure"]').value,
      };
    });
    picker.range = { start: "2026-09-10", end: "2026-09-15" };
  });
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  const state = await page.evaluate(() => ({ events: window.__events, atomic: window.__atomic }));
  expect(state.events).toEqual([0]);
  expect(state.atomic).toEqual({
    visibleStart: "10/09/2026",
    visibleEnd: "15/09/2026",
    hiddenStart: "2026-09-10",
    hiddenEnd: "2026-09-15",
  });
});

test("typing start past end keeps both values and flags the modified bound", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-picker").range = { start: "2026-09-10", end: "2026-09-15" };
  });
  await page.fill("#stay-start", "2026-09-20");
  await page.locator("#stay-start").blur();
  await expect(page.locator("#stay-start")).toHaveValue("20/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  const before = await page.evaluate(() => ({
    start: document.getElementById("stay-start").validationMessage,
    end: document.getElementById("stay-end").validationMessage,
  }));
  expect(before.start).toBe("Le début doit être antérieur ou égal à la fin");
  expect(before.end).toBe("");
  // Inverted business range never reaches the band.
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-15"]')).not.toHaveAttribute(
    "data-range-end",
    /.+/,
  );
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-20"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );

  // Moving the end past the start clears the stale order error on both bounds.
  await page.fill("#stay-end", "25/09/2026");
  await page.locator("#stay-end").blur();
  const after = await page.evaluate(() => ({
    start: document.getElementById("stay-start").validationMessage,
    end: document.getElementById("stay-end").validationMessage,
  }));
  expect(after.start).toBe("");
  expect(after.end).toBe("");
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-25"]')).toHaveAttribute(
    "data-range-end",
    "true",
  );
});

test("picking start with an uneditable end closes and never edits the end", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-end").readOnly = true;
  });
  await page.locator("#stay-start").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("");
  await expect(page.locator("#stay-start")).toBeFocused();
  const range = await page.evaluate(() => document.getElementById("stay-picker").range);
  expect(range).toEqual({ start: "2026-09-10", end: "" });
});

test("Escape after the first selection restores focus to the active bound", async ({ page }) => {
  await page.locator("#stay-start").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", true);
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await page.keyboard.press("Escape");
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-end")).toBeFocused();
});
