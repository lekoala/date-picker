import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/range.html");
  await page.evaluate(() => {
    window.__events = [];
  });
});

test("form reset restores both bounds with a single rangechange", async ({ page }) => {
  await page.fill("#start-date", "12/09/2026");
  await page.locator("#start-date").blur();
  await expect(page.locator("#start-date")).toHaveValue("12/09/2026");
  const before = await page.evaluate(() => window.__events.length);

  await page.evaluate(() => document.getElementById("range-form").reset());
  await expect(page.locator("#start-date")).toHaveValue("10/09/2026");
  await expect(page.locator("#end-date")).toHaveValue("15/09/2026");
  await expect(page.locator('#range-picker input[type="hidden"][name="arrival"]')).toHaveValue("2026-09-10");
  await expect(page.locator('#range-picker input[type="hidden"][name="departure"]')).toHaveValue(
    "2026-09-15",
  );
  const after = await page.evaluate(() => window.__events.length);
  expect(after - before).toBe(1);
});

test("a pending typed commit never overwrites a newer atomic range assignment", async ({ page }) => {
  await page.locator("#start-date").focus();
  await expect(page.locator("#range-picker .dp-picker-panel")).toBeVisible();
  await page.evaluate(() => {
    window.__hang = true;
  });
  await page.fill("#start-date", "15/10/2026");
  await page.locator("#start-date").blur();
  await page.evaluate(() => {
    document.getElementById("range-picker").range = { start: "2026-09-20", end: "2026-09-25" };
  });
  await page.evaluate(() => {
    window.__hang = false;
  });
  await page.waitForTimeout(300);

  await expect(page.locator("#start-date")).toHaveValue("20/09/2026");
  await expect(page.locator("#end-date")).toHaveValue("25/09/2026");
  const range = await page.evaluate(() => document.getElementById("range-picker").range);
  expect(range).toEqual({ start: "2026-09-20", end: "2026-09-25" });
  await expect(page.locator('#range-picker input[type="hidden"][name="arrival"]')).toHaveValue("2026-09-20");
  await expect(page.locator('#range-picker input[type="hidden"][name="departure"]')).toHaveValue(
    "2026-09-25",
  );
  const events = await page.evaluate(() => window.__events);
  expect(events.some((entry) => entry.startsWith("rangechange") && entry.includes("2026-10-15"))).toBe(false);
});

test("connection validation cannot clear a newer atomic range", async ({ page }) => {
  const range = await page.evaluate(async () => {
    const picker = document.createElement("date-picker");
    picker.setAttribute("range", "");
    const start = document.createElement("input");
    start.dataset.rangeStart = "";
    const end = document.createElement("input");
    end.dataset.rangeEnd = "";
    picker.append(start, end);
    document.body.append(picker);
    picker.range = { start: "2026-06-10", end: "2026-06-15" };
    await Promise.resolve();
    return picker.range;
  });
  expect(range).toEqual({ start: "2026-06-10", end: "2026-06-15" });
});

test("range validate applies a recovered availability and keeps values coherent", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("range-picker").min = "2026-09-12";
  });
  const invalid = await page.evaluate(() => document.getElementById("range-picker").validate());
  expect(invalid).toBe(false);
  const message = await page.evaluate(() => document.getElementById("start-date").validationMessage);
  expect(message.trim()).not.toBe("");

  await page.evaluate(() => {
    document.getElementById("range-picker").min = "";
  });
  const valid = await page.evaluate(() => document.getElementById("range-picker").validate());
  expect(valid).toBe(true);
  await expect(page.locator("#start-date")).toHaveValue("10/09/2026");
  await expect(page.locator("#end-date")).toHaveValue("15/09/2026");
  await expect(page.locator('#range-picker input[type="hidden"][name="arrival"]')).toHaveValue("2026-09-10");
  await expect(page.locator('#range-picker input[type="hidden"][name="departure"]')).toHaveValue(
    "2026-09-15",
  );
  const range = await page.evaluate(() => document.getElementById("range-picker").range);
  expect(range).toEqual({ start: "2026-09-10", end: "2026-09-15" });
});

test("disabling the active bound while open closes the popover", async ({ page }) => {
  await page.locator("#start-date").focus();
  await expect(page.locator("#range-picker .dp-picker-panel")).toBeVisible();
  await page.evaluate(() => {
    document.getElementById("start-date").disabled = true;
  });
  await expect(page.locator("#range-picker")).toHaveJSProperty("open", false);
  // Each trigger follows its own bound: disabling start does not disable end.
  await expect(page.locator("#range-picker .dp-picker-button[data-endpoint=start]")).toBeDisabled();
  await expect(page.locator("#range-picker .dp-picker-button[data-endpoint=end]")).toBeEnabled();
  await page.evaluate(() => {
    document.getElementById("end-date").disabled = true;
  });
  await expect(page.locator("#range-picker .dp-picker-button[data-endpoint=end]")).toBeDisabled();
});

test("a stale activation resolving after the endpoint switched never commits", async ({ page }) => {
  await page.locator("#start-date").focus();
  await expect(page.locator("#range-picker .dp-picker-panel")).toBeVisible();
  await page.evaluate(() => {
    window.__hang = true;
  });
  await page.click("#range-picker .dp-next");
  await expect(page.locator("#range-picker date-calendar")).toHaveAttribute("display", "2026-10");
  await page.click('#range-picker .dp-day[data-date="2026-10-13"]');

  // Switch the active endpoint while the availability check is still pending.
  await page.locator("#end-date").focus();
  await page.evaluate(() => {
    window.__hang = false;
  });
  await page.waitForFunction(() =>
    window.__events.some((entry) => entry.startsWith("dateactivate:2026-10-13")),
  );

  await expect(page.locator("#start-date")).toHaveValue("10/09/2026");
  await expect(page.locator("#end-date")).toHaveValue("15/09/2026");
  const events = await page.evaluate(() => window.__events);
  expect(events.some((entry) => entry.startsWith("rangechange"))).toBe(false);
  await expect(page.locator("#range-picker")).toHaveJSProperty("open", true);
});

test("a newer selection supersedes a still-pending older one", async ({ page }) => {
  await page.locator("#start-date").focus();
  await expect(page.locator("#range-picker .dp-picker-panel")).toBeVisible();
  await page.evaluate(() => {
    window.__hang = true;
  });
  await page.click("#range-picker .dp-next");
  await page.click('#range-picker .dp-day[data-date="2026-10-13"]');
  // A second pending activation supersedes the first without waiting for it.
  await page.click('#range-picker .dp-day[data-date="2026-10-05"]');
  await page.evaluate(() => {
    window.__hang = false;
  });
  await page.waitForFunction(() =>
    window.__events.some((entry) => entry.startsWith("dateactivate:2026-10-05")),
  );
  await page.waitForTimeout(200);

  // Only the newer activation commits, exactly once.
  await expect(page.locator("#start-date")).toHaveValue("10/09/2026");
  await expect(page.locator("#end-date")).toHaveValue("05/10/2026");
  const events = await page.evaluate(() => window.__events);
  expect(events.filter((entry) => entry.startsWith("rangechange"))).toHaveLength(1);
});

test("a source reload during range navigation keeps the visible month", async ({ page }) => {
  await page.locator("#start-date").focus();
  await expect(page.locator("#range-picker .dp-picker-panel")).toBeVisible();
  await expect(page.locator("#range-picker date-calendar")).toHaveAttribute("display", "2026-09");

  await page.click("#range-picker .dp-next");
  await expect(page.locator("#range-picker date-calendar")).toHaveAttribute("display", "2026-10");
  // Both bounds re-validate when the 2026-10 source load lands; neither may pull
  // the shared display back to a bound's month.
  await page.waitForTimeout(400);
  await expect(page.locator("#range-picker date-calendar")).toHaveAttribute("display", "2026-10");
});

test("a typed commit pending at disconnect cannot corrupt the reconnected range", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const picker = document.getElementById("range-picker");
    const input = /** @type {HTMLInputElement} */ (document.getElementById("start-date"));
    const events = [];
    picker.addEventListener("rangechange", (event) => events.push({ ...event.detail }));
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("blur"));
    const parent = picker.parentNode;
    const next = picker.nextSibling;
    picker.remove();
    parent.insertBefore(picker, next);
    picker.range = { start: "2026-09-20", end: "2026-09-25" };
    await Promise.resolve();
    await Promise.resolve();
    return {
      range: picker.range,
      startText: input.value,
      hiddenStart: picker.querySelector('input[type="hidden"][name="arrival"]')?.value,
      hiddenEnd: picker.querySelector('input[type="hidden"][name="departure"]')?.value,
      events,
    };
  });
  expect(state.range).toEqual({ start: "2026-09-20", end: "2026-09-25" });
  expect(state.startText).toBe("20/09/2026");
  expect(state.hiddenStart).toBe("2026-09-20");
  expect(state.hiddenEnd).toBe("2026-09-25");
  expect(state.events).toEqual([{ start: "2026-09-20", end: "2026-09-25" }]);
});

test("an atomic range assignment supersedes a still-pending grid pick", async ({ page }) => {
  await page.locator("#start-date").focus();
  await expect(page.locator("#range-picker .dp-picker-panel")).toBeVisible();
  await page.evaluate(() => {
    window.__hang = true;
  });
  await page.click("#range-picker .dp-next");
  await page.click('#range-picker .dp-day[data-date="2026-10-13"]');
  await page.evaluate(() => {
    document.getElementById("range-picker").range = { start: "2026-09-20", end: "2026-09-25" };
    window.__hang = false;
  });
  await page.waitForFunction(() =>
    window.__events.some((entry) => entry.startsWith("dateactivate:2026-10-13")),
  );
  await page.waitForTimeout(100);

  const range = await page.evaluate(() => document.getElementById("range-picker").range);
  expect(range).toEqual({ start: "2026-09-20", end: "2026-09-25" });
});
