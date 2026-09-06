import { expect, test } from "@playwright/test";

test.describe("open-on-focus contract", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/fixtures/focus.html");
  });

  test("focus opens the popover and keeps focus in the input", async ({ page }) => {
    await page.focus("#focus-date");
    const panel = page.locator("#focus-picker .dp-picker-panel");
    await expect(panel).toBeVisible();
    await expect(page.locator("#focus-date")).toBeFocused();
    await expect(page.locator("#focus-picker .dp-day[tabindex='0']")).not.toBeFocused();
    await expect(page.locator("#focus-picker")).toHaveJSProperty("open", true);
  });

  test("typing after focus-open is not captured by the grid", async ({ page }) => {
    await page.focus("#focus-date");
    await expect(page.locator("#focus-picker .dp-picker-panel")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("12/09/2026");
    await expect(page.locator("#focus-date")).toHaveValue("12/09/2026");
    await expect(page.locator("#focus-picker .dp-day[tabindex='0']")).not.toBeFocused();
  });

  test("ArrowDown from the input moves focus into the grid", async ({ page }) => {
    await page.focus("#focus-date");
    await expect(page.locator("#focus-picker .dp-picker-panel")).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#focus-picker .dp-day[tabindex='0']")).toBeFocused();
  });

  test("pressing the button moves focus into the grid", async ({ page }) => {
    await page.click("#focus-picker .dp-picker-button");
    await expect(page.locator("#focus-picker .dp-picker-panel")).toBeVisible();
    await expect(page.locator("#focus-picker .dp-day[tabindex='0']")).toBeFocused();
  });

  test("Escape from the grid returns focus to the input without reopening", async ({ page }) => {
    await page.focus("#focus-date");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#focus-picker .dp-day[tabindex='0']")).toBeFocused();
    await page.keyboard.press("Escape");
    const panel = page.locator("#focus-picker .dp-picker-panel");
    await expect(panel).toBeHidden();
    await expect(page.locator("#focus-date")).toBeFocused();
    await expect(panel).toBeHidden();
  });

  test("Escape from the input closes the focus-opened popover, focus unchanged", async ({ page }) => {
    await page.focus("#focus-date");
    const panel = page.locator("#focus-picker .dp-picker-panel");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.locator("#focus-date")).toBeFocused();
    await expect(panel).toBeHidden();
  });

  test("open-on-focus=false keeps focus passive while button and ArrowDown still work", async ({ page }) => {
    await page.focus("#no-focus-date");
    const panel = page.locator("#no-focus-picker .dp-picker-panel");
    await page.waitForTimeout(200);
    await expect(panel).toBeHidden();
    await expect(page.locator("#no-focus-picker")).toHaveJSProperty("open", false);
    await page.click("#no-focus-picker .dp-picker-button");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await page.keyboard.press("ArrowDown");
    await expect(panel).toBeVisible();
    await expect(page.locator("#no-focus-picker .dp-day[tabindex='0']")).toBeFocused();
  });
});
