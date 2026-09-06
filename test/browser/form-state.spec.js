import { expect, test } from "@playwright/test";

test.describe("form lifecycle and ownership", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/fixtures/form-state.html");
  });

  test("form reset restores the canonical default", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("reset-picker").value = "2026-09-20";
    });
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-20");
    await page.click("#reset-btn");
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-06");
    await expect(page.locator("#reset-date")).toHaveValue("06/09/2026");
    await expect(page.locator('#reset-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-06");
  });

  test("form reset clears a field that had no default", async ({ page }) => {
    await page.fill("#min-date", "12/09/2026");
    await page.locator("#min-date").blur();
    await expect(page.locator("#min-picker")).toHaveAttribute("value", "2026-09-12");
    await page.click("#min-reset");
    await expect(page.locator("#min-picker")).not.toHaveAttribute("value", /.+/);
    await expect(page.locator("#min-date")).toHaveValue("");
  });

  test("disabling the input blocks opening and unsubmits the field", async ({ page }) => {
    await expect(page.locator("#toggle-date")).toBeEnabled();
    await page.click("#disable-toggle");
    await expect(page.locator("#toggle-date")).toBeDisabled();
    await expect(page.locator("#toggle-picker input[type='hidden']")).toBeDisabled();
    await page.click("#toggle-picker .dp-picker-button");
    await expect(page.locator("#toggle-picker .dp-picker-panel")).toBeHidden();
    await page.click("#disable-toggle");
    await expect(page.locator("#toggle-date")).toBeEnabled();
    await page.click("#toggle-picker .dp-picker-button");
    await expect(page.locator("#toggle-picker .dp-picker-panel")).toBeVisible();
  });

  test("a form= attribute is forwarded to the hidden canonical field", async ({ page }) => {
    const hidden = page.locator('#alt-picker input[type="hidden"][name="extern"]');
    await expect(hidden).toHaveAttribute("form", "alt-form");
    expect(await hidden.evaluate((element) => element.form?.id)).toBe("alt-form");
  });

  test("later visible-input name changes never touch the canonical hidden field", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("reset-date").name = "renamed";
    });
    await page.click("#submit-btn");
    // The canonical hidden field keeps name="date"; the late reassignment adds
    // the visible local value back into the payload as a second field.
    await expect(page.locator("#demo-out")).toHaveText("renamed=06%2F09%2F2026&date=2026-09-06");
  });
});
