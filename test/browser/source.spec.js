import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/source.html");
});

test("a failed source load never activates a day or selects it", async ({ page }) => {
  await page.click('#source-cal .dp-day[data-date="2026-09-11"]');
  await expect(page.locator("#source-cal")).toHaveAttribute("value", "2026-09-10");
  await page.waitForFunction(() => window.__events.includes("source-cal:dateinvalid:2026-09-11"));
  const events = await page.evaluate(() => window.__events);
  expect(events.some((entry) => entry.startsWith("source-cal:dateactivate"))).toBe(false);
  expect(events.some((entry) => entry.startsWith("source-cal:datechange"))).toBe(false);
});

test("the same day activates once the source recovers", async ({ page }) => {
  await page.click('#source-cal .dp-day[data-date="2026-09-11"]');
  await page.waitForFunction(() => window.__events.includes("source-cal:dateinvalid:2026-09-11"));
  await page.evaluate(() => {
    window.__fail = false;
  });
  await page.click('#source-cal .dp-day[data-date="2026-09-11"]');
  await expect(page.locator("#source-cal")).toHaveAttribute("value", "2026-09-11");
});

test("a cancelled (stale) load neither activates nor selects a date", async ({ page }) => {
  // Wait for the initial 2026-09 load to settle as failed, then hang every
  // later attempt so the click depends on the stale in-flight load.
  await page.waitForFunction(() =>
    window.__events.some((entry) => entry.startsWith("source-cal:dateloaderror")),
  );
  await page.evaluate(() => {
    window.__fail = false;
    window.__hang = true;
  });
  const day = page.locator('#source-cal .dp-day[data-date="2026-09-11"]');
  await day.click();
  // Navigating away aborts the in-flight load the click is waiting on.
  await page.locator("#source-cal .dp-prev").click();
  await expect(page.locator("#source-cal")).toHaveAttribute("display", "2026-08");
  await page.waitForFunction(() => window.__events.includes("source-cal:dateinvalid:2026-09-11"));
  const events = await page.evaluate(() => window.__events);
  expect(events.some((entry) => entry.startsWith("source-cal:dateactivate"))).toBe(false);
  expect(events.some((entry) => entry.startsWith("source-cal:datechange"))).toBe(false);
  await expect(page.locator("#source-cal")).toHaveAttribute("value", "2026-09-10");
});

test("a failed source load blocks typed validation and the ISO submit value", async ({ page }) => {
  const hidden = page.locator('#source-picker input[type="hidden"][name="source-field"]');
  await page.fill("#source-date", "10/09/2026");
  await page.locator("#source-date").blur();
  // Initial render load (1) plus the blur commit attempt (2) both fail.
  await page.waitForFunction(
    () => window.__events.filter((entry) => entry.startsWith("source-picker:dateloaderror")).length >= 2,
  );
  await expect(hidden).toHaveValue("");
  expect(await page.evaluate(() => document.getElementById("source-date").checkValidity())).toBe(false);
});

test("a recovering source lets the same text commit on the next validation", async ({ page }) => {
  const hidden = page.locator('#source-picker input[type="hidden"][name="source-field"]');
  await page.fill("#source-date", "10/09/2026");
  await page.locator("#source-date").blur();
  await page.waitForFunction(
    () => window.__events.filter((entry) => entry.startsWith("source-picker:dateloaderror")).length >= 2,
  );
  await expect(hidden).toHaveValue("");

  await page.evaluate(() => {
    window.__fail = false;
  });
  const valid = await page.evaluate(() => document.getElementById("source-picker").validate());
  expect(valid).toBe(true);
  await expect(hidden).toHaveValue("2026-09-10");
  await expect(page.locator("#source-picker")).toHaveAttribute("value", "2026-09-10");
});
