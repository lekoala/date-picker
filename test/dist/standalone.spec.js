import { expect, test } from "@playwright/test";

test.describe("packaged standalone bundle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/fixtures/dist.html");
  });

  test("defines both elements through the bundle and imports its own styles", async ({ page }) => {
    const defined = await page.evaluate(async () => {
      await customElements.whenDefined("date-calendar");
      await customElements.whenDefined("date-picker");
      return (
        customElements.get("date-calendar") !== undefined && customElements.get("date-picker") !== undefined
      );
    });
    expect(defined).toBe(true);
    await expect(page.locator("#cal .dp-day")).toHaveCount(42);
    await expect(page.locator("#cal .dp-day[tabindex='0']")).toHaveCount(1);
    const styled = await page.evaluate(() => {
      const sheet = document.getElementById("lekoala-date-picker-styles");
      return sheet ? sheet.textContent.includes("--dp-accent") : false;
    });
    expect(styled).toBe(true);
  });

  test("mini calendar navigates without acquiring a value", async ({ page }) => {
    await page.click('#mini .dp-day[data-date="2026-09-10"]');
    await expect(page.locator("#anchor")).toHaveText("2026-09-10");
    await expect(page.locator("#mini")).not.toHaveAttribute("value", /.+/);
  });

  test("picker opens and commits through the bundle", async ({ page }) => {
    await page.click("#picker .dp-picker-button");
    await expect(page.locator("#picker .dp-picker-panel")).toBeVisible();
    await page.click('#picker .dp-day[data-date="2026-09-11"]');
    await expect(page.locator("#picker")).toHaveAttribute("value", "2026-09-11");
    await expect(page.locator('#picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-11");
  });
});
