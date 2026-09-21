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

test("the start trigger fills start, then the flow moves to end", async ({ page }) => {
  await page.click("#stay-picker .dp-picker-button[data-endpoint=start]");
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("");
  // The incomplete range keeps the shared popup open on the end bound.
  await page.click('#stay-picker .dp-day[data-date="2026-09-20"]');
  await expect(page.locator("#stay-end")).toHaveValue("20/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
});

test("the end trigger targets the end bound", async ({ page }) => {
  await page.click("#stay-picker .dp-picker-button[data-endpoint=end]");
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await page.click('#stay-picker .dp-day[data-date="2026-09-20"]');
  await expect(page.locator("#stay-end")).toHaveValue("20/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("");
});

test("the other bound's trigger switches the active endpoint without closing", async ({ page }) => {
  const start = page.locator("#stay-picker .dp-picker-button[data-endpoint=start]");
  const end = page.locator("#stay-picker .dp-picker-button[data-endpoint=end]");
  await start.click();
  const panel = page.locator("#stay-picker .dp-picker-panel");
  await expect(panel).toBeVisible();
  await expect(start).toHaveAttribute("aria-expanded", "true");
  await expect(end).toHaveAttribute("aria-expanded", "true");

  await end.click();
  // One shared popup that stays open, not a toggle and not a second panel.
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", true);
  await expect(panel).toBeVisible();
  await expect(page.locator("#stay-picker > .dp-picker-panel")).toHaveCount(1);
  await page.click('#stay-picker .dp-day[data-date="2026-09-20"]');
  await expect(page.locator("#stay-end")).toHaveValue("20/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("");
});

test("keyboard activation of the other bound's trigger also switches, not closes", async ({ page }) => {
  await page.click("#stay-picker .dp-picker-button[data-endpoint=start]");
  const end = page.locator("#stay-picker .dp-picker-button[data-endpoint=end]");
  await end.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", true);
  await expect(page.locator('#stay-picker .dp-day[tabindex="0"]')).toBeFocused();
});

test("a completed range extends before or after regardless of the opening field", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-picker").range = { start: "2026-09-10", end: "2026-09-15" };
  });
  await page.locator("#stay-end").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();

  await page.click('#stay-picker .dp-day[data-date="2026-09-05"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("05/09/2026");

  await page.click("#stay-picker .dp-picker-button[data-endpoint=start]");
  await page.click('#stay-picker .dp-day[data-date="2026-09-20"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-end")).toHaveValue("20/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("05/09/2026");
  await expect(page.locator('#stay-picker input[type="hidden"][name="arrival"]')).toHaveValue("2026-09-05");
  await expect(page.locator('#stay-picker input[type="hidden"][name="departure"]')).toHaveValue("2026-09-20");
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

test("typed range commits keep native input/change only", async ({ page }) => {
  await page.evaluate(() => {
    window.__counts = { input: 0, change: 0 };
    const start = document.getElementById("stay-start");
    start.addEventListener("input", () => window.__counts.input++);
    start.addEventListener("change", () => window.__counts.change++);
  });
  await page.fill("#stay-start", "10/09/2026");
  await page.locator("#stay-start").blur();
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  const counts = await page.evaluate(() => window.__counts);
  expect(counts).toEqual({ input: 1, change: 1 });
});

test("calendar range picks still synthesize input/change", async ({ page }) => {
  await page.evaluate(() => {
    window.__counts = { input: 0, change: 0 };
    const start = document.getElementById("stay-start");
    start.addEventListener("input", () => window.__counts.input++);
    start.addEventListener("change", () => window.__counts.change++);
  });
  await page.locator("#stay-start").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  const counts = await page.evaluate(() => window.__counts);
  expect(counts).toEqual({ input: 1, change: 1 });
});

test("a second pick before the first is sorted, not refused", async ({ page }) => {
  await page.evaluate(() => {
    window.__events = [];
    const picker = document.getElementById("stay-picker");
    for (const name of ["rangechange", "dateinvalid"]) {
      picker.addEventListener(name, (event) =>
        window.__events.push(`${name}:${event.detail?.start ?? ""}:${event.detail?.end ?? ""}`),
      );
    }
  });
  await page.locator("#stay-start").focus();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");

  await page.click('#stay-picker .dp-day[data-date="2026-09-05"]');
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#stay-start")).toHaveValue("05/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("10/09/2026");
  await expect(page.locator('#stay-picker input[type="hidden"][name="arrival"]')).toHaveValue("2026-09-05");
  await expect(page.locator('#stay-picker input[type="hidden"][name="departure"]')).toHaveValue("2026-09-10");
  // Both bounds move at once, announced once, with no refusal on the way.
  const events = await page.evaluate(() => window.__events);
  expect(events).toEqual(["rangechange:2026-09-10:", "rangechange:2026-09-05:2026-09-10"]);
});

test("the sorted second pick fires input/change on both moved bounds only", async ({ page }) => {
  await page.evaluate(() => {
    window.__counts = { start: [], end: [] };
    for (const [key, id] of [
      ["start", "stay-start"],
      ["end", "stay-end"],
    ]) {
      const input = document.getElementById(id);
      for (const name of ["input", "change"]) {
        input.addEventListener(name, () => window.__counts[key].push(name));
      }
    }
  });
  await page.locator("#stay-start").focus();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await page.click('#stay-picker .dp-day[data-date="2026-09-05"]');
  await expect(page.locator("#stay-end")).toHaveValue("10/09/2026");
  const counts = await page.evaluate(() => window.__counts);
  expect(counts).toEqual({
    start: ["input", "change", "input", "change"],
    end: ["input", "change"],
  });
});

test("picking the same day twice makes a one-day range", async ({ page }) => {
  await page.locator("#stay-start").focus();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("10/09/2026");
  expect(await page.evaluate(() => document.getElementById("stay-picker").range)).toEqual({
    start: "2026-09-10",
    end: "2026-09-10",
  });
});

test("hovering after the first pick previews the range on both sides", async ({ page }) => {
  await page.evaluate(() => {
    window.__events = [];
    document
      .getElementById("stay-picker")
      .addEventListener("rangechange", () => window.__events.push("rangechange"));
  });
  await page.locator("#stay-start").focus();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await page.evaluate(() => {
    window.__events = [];
  });

  await page.hover('#stay-picker .dp-day[data-date="2026-09-13"]');
  const calendar = page.locator("#stay-picker date-calendar");
  await expect(calendar).toHaveAttribute("data-range-preview", "");
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-12"]')).toHaveAttribute(
    "data-in-range",
    "true",
  );
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-13"]')).toHaveAttribute(
    "data-range-end",
    "true",
  );

  // Before the anchor the preview shows the sorted range the pick would commit.
  await page.hover('#stay-picker .dp-day[data-date="2026-09-07"]');
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-07"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-end",
    "true",
  );

  // Preview is presentation only: no commit, no field write.
  expect(await page.evaluate(() => window.__events)).toEqual([]);
  await expect(page.locator("#stay-end")).toHaveValue("");
  expect(await page.evaluate(() => document.getElementById("stay-picker").range)).toEqual({
    start: "2026-09-10",
    end: "",
  });
});

test("leaving the grid restores the committed band", async ({ page }) => {
  await page.locator("#stay-start").focus();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await page.hover('#stay-picker .dp-day[data-date="2026-09-13"]');
  await expect(page.locator("#stay-picker date-calendar")).toHaveAttribute("data-range-preview", "");

  await page.hover("#stay-picker .dp-picker-button[data-endpoint=start]");
  await expect(page.locator("#stay-picker date-calendar")).not.toHaveAttribute("data-range-preview", /.*/);
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-13"]')).not.toHaveAttribute(
    "data-range-end",
    /.*/,
  );
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
});

test("keyboard navigation previews exactly what Enter commits", async ({ page }) => {
  await page.locator("#stay-start").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('#stay-picker .dp-day[tabindex="0"]')).toBeFocused();
  await page.evaluate(() => {
    const calendar = document.querySelector("#stay-picker date-calendar");
    calendar.focusDate("2026-09-10");
  });
  await page.keyboard.press("Enter");
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");

  // Arrowing backwards from the anchor previews the sorted range immediately.
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#stay-picker date-calendar")).toHaveAttribute("data-range-preview", "");
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-08"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-end",
    "true",
  );

  await page.keyboard.press("Enter");
  await expect(page.locator("#stay-start")).toHaveValue("08/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("10/09/2026");
});

test("an unavailable candidate promises no preview", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("stay-picker");
    picker.isDateDisabled = (date) => date === "2026-09-13";
  });
  await page.locator("#stay-start").focus();
  await page.click('#stay-picker .dp-day[data-date="2026-09-10"]');
  await page.hover('#stay-picker .dp-day[data-date="2026-09-13"]');
  await expect(page.locator("#stay-picker date-calendar")).not.toHaveAttribute("data-range-preview", /.*/);
  await expect(page.locator('#stay-picker .dp-day[data-date="2026-09-12"]')).not.toHaveAttribute(
    "data-in-range",
    /.*/,
  );
});
