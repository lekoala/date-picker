import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("picker keeps localized editable display and canonical form value", async ({ page }) => {
  await expect(page.locator("#simple-date")).toHaveValue("06/09/2026");
  await expect(page.locator('#simple-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-06");
  await page.click("#simple-form button[type='submit']");
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

test("Tab reaches the trigger, month/year controls and the single grid tab stop", async ({ page }) => {
  await page.locator("#simple-date").focus();
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeVisible();
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toHaveCount(1);

  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-picker-button")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-month-select")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-year-input")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-prev")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-next")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
});

test("the simple picker draws one composite ring around the field and trigger", async ({ page }) => {
  const accent = "rgb(37, 99, 235)";
  const shadowOf = (selector) =>
    page.locator(selector).evaluate((element) => getComputedStyle(element).boxShadow);
  await page.locator("#simple-date").focus();
  // The ring belongs to the host, not to its two halves.
  const hostShadow = await shadowOf("#simple-picker");
  expect(hostShadow).not.toBe("none");
  expect(hostShadow).toContain("3px");
  await expect(page.locator("#simple-date")).toHaveCSS("box-shadow", "none");
  await expect(page.locator("#simple-date")).toHaveCSS("outline-style", "none");
  await expect(page.locator("#simple-date")).toHaveCSS("border-top-color", accent);
  // The adjoining trigger follows so the composite reads as one control.
  await expect(page.locator("#simple-picker .dp-picker-button")).toHaveCSS("border-top-color", accent);
  await expect(page.locator("#simple-picker .dp-picker-button")).toHaveCSS("box-shadow", "none");
});

test("time companions keep their own ring and stay out of the host composite", async ({ page }) => {
  const accent = "rgb(37, 99, 235)";
  await page.locator("#time-start").focus();
  const timeShadow = await page
    .locator("#time-start")
    .evaluate((element) => getComputedStyle(element).boxShadow);
  expect(timeShadow).toContain("3px");
  await expect(page.locator("#time-start")).toHaveCSS("border-top-color", accent);
  await expect(page.locator("#time-start")).toHaveCSS("outline-style", "none");
  // The host hosts the time inputs too, so it must not paint a composite ring.
  await expect(page.locator("#time-picker")).toHaveCSS("box-shadow", "none");
});

test("range bounds keep per-bound focus without a host ring", async ({ page }) => {
  await page.locator("#stay-start").focus();
  const boundShadow = await page
    .locator("#stay-start")
    .evaluate((element) => getComputedStyle(element).boxShadow);
  expect(boundShadow).toContain("3px");
  await expect(page.locator("#stay-picker")).toHaveCSS("box-shadow", "none");
});

test("the month select uses an author-drawn caret and hands it back in forced colors", async ({ page }) => {
  const select = page.locator("#inline .dp-month-select");
  await expect(select).toHaveCSS("appearance", "none");
  const normal = await select.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(normal).not.toBe("none");
  // Room for the caret on the trailing side (2rem), text keeps the small inset.
  await expect(select).toHaveCSS("padding-right", "32px");
  await expect(select).toHaveCSS("padding-left", "7.2px");

  // RTL: the logical padding flips, the physically-positioned caret mirrors.
  const rtl = await page.evaluate(() => {
    document.documentElement.dir = "rtl";
    const element = document.querySelector("#inline .dp-month-select");
    const style = getComputedStyle(element);
    return { left: style.paddingLeft, right: style.paddingRight, position: style.backgroundPosition };
  });
  expect(rtl.left).toBe("32px");
  expect(rtl.right).toBe("7.2px");
  expect(rtl.position).toContain("14.4px");

  await page.evaluate(() => {
    document.documentElement.dir = "ltr";
  });
  await page.emulateMedia({ forcedColors: "active" });
  await expect(select).toHaveCSS("appearance", "auto");
  await expect(select).toHaveCSS("background-image", "none");
  await expect(select).toHaveCSS("padding-right", "7.2px");
});

test("typing a locale date commits the ISO value", async ({ page }) => {
  await page.fill("#simple-date", "10/09/2026");
  await page.locator("#simple-date").blur();
  await expect(page.locator('#simple-picker input[type="hidden"][name="date"]')).toHaveValue("2026-09-10");
  await expect(page.locator("#simple-picker")).toHaveAttribute("value", "2026-09-10");
});

test("open reflects the popover state and Escape restores focus", async ({ page }) => {
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await page.click("#simple-picker .dp-picker-button");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeHidden();
  await expect(page.locator("#simple-date")).toBeFocused();
});

test("keyboard Enter on the open trigger moves into the grid instead of closing", async ({ page }) => {
  await page.locator("#simple-date").focus();
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-picker-button")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#simple-date")).toBeFocused();
});

test("mouse click on the open trigger still closes the popover", async ({ page }) => {
  await page.click("#simple-picker .dp-picker-button");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await page.click("#simple-picker .dp-picker-button");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
});

test("range linkage updates reciprocal effective bounds", async ({ page }) => {
  await expect(page.locator("#end-picker")).toHaveAttribute("min", "2026-09-10");
  await expect(page.locator("#start-picker")).toHaveAttribute("max", "2026-09-15");
  await page.evaluate(() => {
    document.getElementById("start-picker").value = "2026-09-12";
  });
  await expect(page.locator("#end-picker")).toHaveAttribute("min", "2026-09-12");
});

test("explicit validate rechecks constraints on an already-selected value", async ({ page }) => {
  await expect(page.locator("#simple-picker")).toHaveAttribute("value", "2026-09-06");
  await page.evaluate(() => {
    document.getElementById("simple-picker").min = "2026-09-20";
  });
  const invalid = await page.evaluate(() => document.getElementById("simple-picker").validate());
  expect(invalid).toBe(false);
  const message = await page.evaluate(() => document.getElementById("simple-date").validationMessage);
  expect(message.trim()).not.toBe("");
  await page.evaluate(() => {
    document.getElementById("simple-picker").min = "";
  });
  const valid = await page.evaluate(() => document.getElementById("simple-picker").validate());
  expect(valid).toBe(true);
  await expect(page.locator("#simple-picker")).toHaveAttribute("value", "2026-09-06");
});

test("month-format forwards short months to the popup calendar", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.createElement("date-picker");
    picker.id = "short-picker";
    picker.setAttribute("locale", "fr-BE");
    picker.setAttribute("month-format", "short");
    const input = document.createElement("input");
    input.name = "date";
    picker.append(input);
    document.body.append(picker);
  });
  await page.locator("#short-picker").evaluate((picker) => picker.show());
  const text = await page.locator('#short-picker .dp-month-select option[value="09"]').textContent();
  const expected = await page.evaluate(() =>
    new Intl.DateTimeFormat("fr-BE", { calendar: "gregory", month: "short", timeZone: "UTC" }).format(
      new Date(Date.UTC(2026, 8, 15)),
    ),
  );
  expect(text).toBe(expected);
});
