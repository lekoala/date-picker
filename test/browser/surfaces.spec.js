import { expect, test } from "@playwright/test";

test.describe("popover inside nested app surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/fixtures/surfaces.html");
  });

  test("opens inside a modal dialog, selects, and keeps the dialog open", async ({ page }) => {
    const dialog = page.locator("#surface-dialog");
    const panel = page.locator("#dialog-picker .dp-picker-panel");
    await page.click("#open-dialog");
    await expect(dialog).toHaveJSProperty("open", true);
    // showModal() focuses the picker input first, which opens the popover on focus.
    await expect(panel).toBeVisible();
    await expect(page.locator("#dialog-date")).toBeFocused();
    await expect(panel).not.toHaveAttribute("aria-modal", "true");
    await page.click('#dialog-picker .dp-day[data-date="2026-09-10"]');
    await expect(panel).toBeHidden();
    await expect(page.locator("#dialog-picker")).toHaveAttribute("value", "2026-09-10");
    await expect(page.locator('#dialog-picker input[type="hidden"][name="appointment"]')).toHaveValue(
      "2026-09-10",
    );
    await expect(dialog).toHaveJSProperty("open", true);
  });

  test("Escape closes the popover first, then the dialog", async ({ page }) => {
    const dialog = page.locator("#surface-dialog");
    const panel = page.locator("#dialog-picker .dp-picker-panel");
    await page.click("#open-dialog");
    await expect(panel).toBeVisible();
    await expect(page.locator("#dialog-date")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(page.locator("#dialog-date")).toBeFocused();
    await expect(dialog).toHaveJSProperty("open", true);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveJSProperty("open", false);
  });

  test("popover stays in the viewport inside an overflow/transform container", async ({ page }) => {
    await page.click("#nested-picker .dp-picker-button");
    const panel = page.locator("#nested-picker .dp-picker-panel");
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("role", "dialog");
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  });
});
