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

  test("form reset after a calendar selection restores the default", async ({ page }) => {
    await page.click("#reset-picker .dp-picker-button");
    await page.click('#reset-picker .dp-day[data-date="2026-09-18"]');
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-18");
    await page.click("#reset-btn");
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-06");
    await expect(page.locator("#reset-date")).toHaveValue("06/09/2026");
  });

  test("form reset after an invalid manual input restores the default", async ({ page }) => {
    await page.fill("#reset-date", "99/99/2026");
    await page.locator("#reset-date").blur();
    await expect(page.locator("#reset-date")).toHaveValue("99/99/2026");
    await page.evaluate(() => document.getElementById("reset-picker").hide());
    await page.click("#reset-btn");
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-06");
    await expect(page.locator("#reset-date")).toHaveValue("06/09/2026");
  });

  test("impossible then valid manual input updates native validity without a stale error", async ({
    page,
  }) => {
    await page.fill("#reset-date", "99/99/2026");
    await page.locator("#reset-date").blur();

    const invalid = await page.evaluate(() => {
      const input = /** @type {HTMLInputElement} */ (document.getElementById("reset-date"));
      return { valid: input.checkValidity(), message: input.validationMessage };
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.message.length).toBeGreaterThan(0);

    await page.fill("#reset-date", "12/09/2026");
    await page.locator("#reset-date").blur();
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-12");

    const valid = await page.evaluate(() => {
      const input = /** @type {HTMLInputElement} */ (document.getElementById("reset-date"));
      return { valid: input.checkValidity(), message: input.validationMessage };
    });
    expect(valid.valid).toBe(true);
    expect(valid.message).toBe("");
  });

  test("changing input.defaultValue drives the next reset", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("reset-date").defaultValue = "20/09/2026";
      document.getElementById("reset-picker").value = "2026-09-10";
    });
    await page.click("#reset-btn");
    await expect(page.locator("#reset-picker")).toHaveAttribute("value", "2026-09-20");
    await expect(page.locator("#reset-date")).toHaveValue("20/09/2026");
    await expect(page.locator('#reset-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-20");
  });

  test("disabling the input blocks opening and unsubmits the field", async ({ page }) => {
    await expect(page.locator("#toggle-date")).toBeEnabled();
    await page.click("#disable-toggle");
    await expect(page.locator("#toggle-date")).toBeDisabled();
    await expect(page.locator("#toggle-picker input[type='hidden']")).toBeDisabled();
    await expect(page.locator("#toggle-picker .dp-picker-button")).toBeDisabled();
    const opened = await page.evaluate(() => {
      const picker = document.getElementById("toggle-picker");
      picker.show();
      return picker.open;
    });
    expect(opened).toBe(false);
    await page.click("#disable-toggle");
    await expect(page.locator("#toggle-date")).toBeEnabled();
    await expect(page.locator("#toggle-picker .dp-picker-button")).toBeEnabled();
    await page.click("#toggle-picker .dp-picker-button");
    await expect(page.locator("#toggle-picker .dp-picker-panel")).toBeVisible();
  });

  test("readonly keeps the value submitted while the picker cannot open it", async ({ page }) => {
    const hidden = page.locator('#ro-picker input[type="hidden"][name="readonly-date"]');
    await page.click("#readonly-toggle");
    await expect(page.locator("#ro-date")).toHaveAttribute("readonly", "");
    await expect(page.locator("#ro-picker .dp-picker-button")).toBeDisabled();
    await expect(hidden).not.toBeDisabled();
    await expect(hidden).toHaveValue("2026-09-08");
    const opened = await page.evaluate(() => {
      const picker = document.getElementById("ro-picker");
      picker.show();
      return picker.open;
    });
    expect(opened).toBe(false);
    await page.click("#readonly-toggle");
    await expect(page.locator("#ro-picker .dp-picker-button")).toBeEnabled();
    await page.click("#ro-picker .dp-picker-button");
    await expect(page.locator("#ro-picker .dp-picker-panel")).toBeVisible();
  });

  test("readonly while open closes the popover and stays closed", async ({ page }) => {
    await page.click("#ro-picker .dp-picker-button");
    await expect(page.locator("#ro-picker .dp-picker-panel")).toBeVisible();
    await page.click("#readonly-toggle");
    await expect(page.locator("#ro-picker .dp-picker-panel")).toBeHidden();
    await expect(page.locator("#ro-picker")).toHaveJSProperty("open", false);
    expect(await page.locator("#ro-picker .dp-picker-button").isDisabled()).toBe(true);
  });

  test("disabling the input while open closes the popover", async ({ page }) => {
    await page.click("#toggle-picker .dp-picker-button");
    await expect(page.locator("#toggle-picker .dp-picker-panel")).toBeVisible();
    await page.click("#disable-toggle");
    await expect(page.locator("#toggle-picker .dp-picker-panel")).toBeHidden();
    await expect(page.locator("#toggle-picker")).toHaveJSProperty("open", false);
  });

  test("clearing an optional field clears the canonical value and emits valuechange", async ({ page }) => {
    await page.evaluate(() => {
      window.__valueChanges = 0;
      document.getElementById("min-picker").addEventListener("valuechange", () => window.__valueChanges++);
    });
    await page.fill("#min-date", "12/09/2026");
    await page.locator("#min-date").blur();
    await expect(page.locator("#min-picker")).toHaveAttribute("value", "2026-09-12");
    await page.fill("#min-date", "");
    await page.locator("#min-date").blur();
    await expect(page.locator("#min-picker")).not.toHaveAttribute("value", /.+/);
    await expect(page.locator('#min-picker input[type="hidden"]')).toHaveValue("");
    expect(await page.evaluate(() => window.__valueChanges)).toBeGreaterThan(0);
  });

  test("clearing a required field leaves a canonical blank that fails native validation", async ({
    page,
  }) => {
    await page.fill("#reset-date", "");
    await page.locator("#reset-date").blur();
    await expect(page.locator("#reset-picker")).not.toHaveAttribute("value", /.+/);
    await expect(page.locator('#reset-picker input[type="hidden"][name="date"]')).toHaveValue("");
    const validity = await page.evaluate(() => document.getElementById("reset-date").checkValidity());
    expect(validity).toBe(false);
    await page.evaluate(() => document.getElementById("reset-picker").hide());
    await page.click("#submit-btn");
    await expect(page.locator("#demo-out")).toHaveText("");
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
    // The hidden canonical field takes the new name; the visible input is
    // stripped of name so the payload holds a single ISO value.
    await expect(page.locator("#demo-out")).toHaveText("renamed=2026-09-06");
  });
});
