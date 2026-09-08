import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

// Some engines (e.g. Playwright's WebKit build) have no time-input support
// and fall back to `type=text`. Order and native time validation only apply
// where times are real; elsewhere the picker must degrade gracefully.
async function supportsTime(page) {
  return page.evaluate(() => {
    const el = document.createElement("input");
    el.setAttribute("type", "time");
    return el.type === "time";
  });
}

test("time companions stay native: no hidden time inputs", async ({ page }) => {
  await expect(page.locator('#time-picker input[type="hidden"]')).toHaveCount(1);
  await expect(page.locator('#time-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-10");
  await expect(page.locator('#time-picker input[type="hidden"][name="from"]')).toHaveCount(0);
  await expect(page.locator('#time-picker input[type="hidden"][name="to"]')).toHaveCount(0);
  await expect(page.locator("#time-start")).toHaveAttribute("name", "from");
  await expect(page.locator("#time-end")).toHaveAttribute("name", "to");
});

test("form submits the ISO date plus the native times", async ({ page }) => {
  await page.click("#time-form button[type='submit']");
  await expect(page.locator("#time-state")).toContainText("date=2026-09-10 from=09:30 to=11:00");
});

test("an inverted from/to range is invalid on the modified bound only", async ({ page }) => {
  test.skip(!(await supportsTime(page)), "needs native time input support");
  await page.fill("#time-end", "08:00");
  await expect(async () => {
    expect(await page.evaluate(() => document.getElementById("time-end").checkValidity())).toBe(false);
    expect(await page.evaluate(() => document.getElementById("time-start").checkValidity())).toBe(true);
    expect(await page.evaluate(() => document.getElementById("time-picker").validate())).toBe(false);
  }).toPass();
  await expect(page.locator("#time-end")).not.toHaveJSProperty("validationMessage", "");

  await page.fill("#time-end", "12:00");
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(true);
  }).toPass();
  await expect(page.locator("#time-end")).toHaveJSProperty("validationMessage", "");
});

test("equal from/to times are allowed and a missing time lifts the constraint", async ({ page }) => {
  await page.fill("#time-end", "09:30");
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(true);
  }).toPass();

  await page.fill("#time-start", "14:00");
  await page.fill("#time-end", "");
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(true);
  }).toPass();
});

test("calendar selection keeps the entered times", async ({ page }) => {
  await page.click("#time-picker .dp-picker-button");
  await page.click('#time-picker .dp-day[data-date="2026-09-15"]');
  await expect(page.locator('#time-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-15");
  await expect(page.locator("#time-start")).toHaveValue("09:30");
  await expect(page.locator("#time-end")).toHaveValue("11:00");
});

test("focusing a time does not open the calendar", async ({ page }) => {
  await page.locator("#time-start").focus();
  await expect(page.locator("#time-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#time-picker .dp-picker-panel")).toBeHidden();
});

test("validate() aggregates native time constraints", async ({ page }) => {
  test.skip(!(await supportsTime(page)), "needs native time input support");
  await page.evaluate(() => document.getElementById("time-start").setAttribute("min", "10:00"));
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(false);
  }).toPass();

  await page.evaluate(() => document.getElementById("time-start").removeAttribute("min"));
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(true);
  }).toPass();
});

test("a single time posts an application-composed ISO datetime", async ({ page }) => {
  await expect(page.locator('#solo-picker input[type="hidden"]')).toHaveCount(1);
  await page.click("#solo-form button[type='submit']");
  await expect(page.locator("#solo-state")).toContainText("appointment=2026-09-10T09:30");

  await page.fill("#solo-time", "");
  await page.click("#solo-form button[type='submit']");
  await expect(page.locator("#solo-state")).toContainText("appointment=—");
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("solo-picker").validate());
    expect(valid).toBe(true);
  }).toPass();
});

test("without native time support the date picker keeps working and times stay plain", async ({ page }) => {
  test.skip(await supportsTime(page), "needs an engine without time input support");
  await expect(page.locator("#time-start")).toHaveJSProperty("type", "text");
  await page.fill("#time-end", "08:00");
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(true);
  }).toPass();
  await page.click("#time-form button[type='submit']");
  await expect(page.locator("#time-state")).toContainText("date=2026-09-10 from=09:30 to=08:00");
});

test("a disabled time is excluded from the order constraint", async ({ page }) => {
  test.skip(!(await supportsTime(page)), "needs native time input support");
  await page.fill("#time-end", "08:00");
  await expect(async () => {
    const invalid = await page.evaluate(() => !document.getElementById("time-end").checkValidity());
    expect(invalid).toBe(true);
  }).toPass();

  await page.evaluate(() => {
    document.getElementById("time-end").disabled = true;
  });
  await expect(async () => {
    const valid = await page.evaluate(() => document.getElementById("time-picker").validate());
    expect(valid).toBe(true);
  }).toPass();
});
