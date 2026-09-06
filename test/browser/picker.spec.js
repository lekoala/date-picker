import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("picker keeps localized editable display and canonical form value", async ({ page }) => {
  await expect(page.locator("#simple-date")).toHaveValue("06/09/2026");
  await expect(page.locator('#simple-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-06");
  await page.click('#simple-form button[type="submit"], #simple-form button');
  await expect(page.locator("#form-state")).toContainText("date=2026-09-06");
});

test("picker opens a dialog popover and focuses one grid cell", async ({ page }) => {
  await page.click("#simple-picker .dp-picker-button");
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeVisible();
  await expect(page.locator('#simple-picker .dp-picker-panel[role="dialog"]')).toHaveCount(1);
  await expect(page.locator('#simple-picker .dp-picker-panel[aria-modal="true"]')).toHaveCount(0);
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeHidden();
});

test("typing a locale date commits the ISO value", async ({ page }) => {
  await page.fill("#simple-date", "10/09/2026");
  await page.locator("#simple-date").blur();
  await expect(page.locator('#simple-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-10");
  await expect(page.locator("#simple-picker")).toHaveAttribute("value", "2026-09-10");
});

test("range linkage updates reciprocal effective bounds", async ({ page }) => {
  await expect(page.locator("#end-picker")).toHaveAttribute("min", "2026-09-10");
  await expect(page.locator("#start-picker")).toHaveAttribute("max", "2026-09-15");
  await page.evaluate(() => {
    document.getElementById("start-picker").value = "2026-09-12";
  });
  await expect(page.locator("#end-picker")).toHaveAttribute("min", "2026-09-12");
});
