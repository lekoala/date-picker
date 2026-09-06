import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("fixed weeks is presentation while the inline calendar keeps one roving tab stop", async ({ page }) => {
  await page.selectOption("#inline .dp-year-select", "2021");
  await page.selectOption("#inline .dp-month-select", "02");
  await expect(page.locator("#inline .dp-day")).toHaveCount(42);
  await expect(page.locator('#inline .dp-day[tabindex="0"]')).toHaveCount(1);
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
});

test("month/year navigation changes display but not selection", async ({ page }) => {
  await page.selectOption("#inline .dp-month-select", "10");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-10");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
});

test("arrow keys move focus; Enter activates and selects", async ({ page }) => {
  const selected = page.locator('#inline .dp-day[data-date="2026-09-10"]');
  await selected.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-11"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
  await page.keyboard.press("Enter");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-11");
});

test("selection=none emits navigation without acquiring a value", async ({ page }) => {
  await page.click('#mini .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#agenda-anchor")).toHaveAttribute("data-date", "2026-09-10");
  await expect(page.locator("#mini")).not.toHaveAttribute("value", /.+/);
});

test("outside-month days remain activatable in the mini calendar", async ({ page }) => {
  const outside = page.locator('#mini .dp-day[data-date="2026-08-31"]');
  await expect(outside).toHaveAttribute("data-outside-month", "true");
  await outside.click();
  await expect(page.locator("#agenda-anchor")).toHaveAttribute("data-date", "2026-08-31");
});

test("weekends can be disabled without disappearing from keyboard navigation", async ({ page }) => {
  const saturday = page.locator('#constrained .dp-day[data-date="2026-09-05"]');
  await expect(saturday).toHaveAttribute("aria-disabled", "true");
  await saturday.focus();
  await expect(saturday).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#constrained")).not.toHaveAttribute("value", "2026-09-05");
  await expect(page.locator('#constrained .dp-day[data-date="2026-09-12"]')).not.toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
