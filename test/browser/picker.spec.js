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

const shadowOf = (page, selector) =>
  page.locator(selector).evaluate((element) => getComputedStyle(element).boxShadow);

test("the trigger is painted inside the field box, which owns the focus ring", async ({ page }) => {
  const accent = "rgb(37, 99, 235)";
  await page.locator("#simple-date").focus();
  const box = await page.evaluate(() => {
    const picker = document.getElementById("simple-picker");
    const input = document.getElementById("simple-date");
    const button = picker.querySelector(".dp-picker-button");
    const a = input.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    return {
      inputRight: Math.round(a.right),
      buttonRight: Math.round(b.right),
      buttonLeft: Math.round(b.left),
      height: Math.round(b.height),
      inputHeight: Math.round(a.height),
      padEnd: getComputedStyle(input).paddingInlineEnd,
    };
  });
  // The trigger sits flush at the field's inline-end, inside its box.
  expect(box.buttonRight).toBe(box.inputRight);
  expect(box.buttonLeft).toBeLessThan(box.inputRight);
  expect(box.height).toBe(box.inputHeight);
  expect(box.padEnd).toBe("48px");
  // The field is the real box: its own ring wraps the affordance too.
  const fieldShadow = await shadowOf(page, "#simple-date");
  expect(fieldShadow).toContain("3px");
  await expect(page.locator("#simple-date")).toHaveCSS("border-top-color", accent);
  await expect(page.locator("#simple-picker")).toHaveCSS("box-shadow", "none");
  // No chrome of its own: transparent, borderless (the authored field shows).
  await expect(page.locator("#simple-picker .dp-picker-button")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator("#simple-picker .dp-picker-button")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
});

test("a focused trigger draws a small inner ring, like the native time indicator", async ({ page }) => {
  await page.locator("#simple-picker .dp-picker-button").focus();
  const button = page.locator("#simple-picker .dp-picker-button");
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(button).toHaveCSS("outline-width", "2px");
  await expect(button).toHaveCSS("outline-offset", "-5px");
  await expect(button).toHaveCSS("border-radius", "8px");
  // The field is not focused, so it shows no ring of its own.
  await expect(page.locator("#simple-date")).toHaveCSS("box-shadow", "none");
});

test("a focused time companion keeps its own ring, outside the date field", async ({ page }) => {
  const accent = "rgb(37, 99, 235)";
  await page.locator("#time-start").focus();
  const timeShadow = await shadowOf(page, "#time-start");
  expect(timeShadow).toContain("3px");
  await expect(page.locator("#time-start")).toHaveCSS("border-top-color", accent);
  await expect(page.locator("#time-start")).toHaveCSS("outline-style", "none");
  await expect(page.locator("#time-picker")).toHaveCSS("box-shadow", "none");
});

test("the date field beside time companions rings its own box, trigger included", async ({ page }) => {
  await page.locator("#time-date").focus();
  const boxes = await page.evaluate(() => {
    const input = document.getElementById("time-date");
    const button = document.querySelector("#time-picker .dp-picker-button");
    const time = document.getElementById("time-start");
    const a = input.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    const t = time.getBoundingClientRect();
    return {
      inputRight: Math.round(a.right),
      buttonRight: Math.round(b.right),
      buttonLeft: Math.round(b.left),
      timeLeft: Math.round(t.left),
    };
  });
  // The trigger is inside the date field's box; the time starts after it.
  expect(boxes.buttonRight).toBe(boxes.inputRight);
  expect(boxes.buttonLeft).toBeLessThan(boxes.inputRight);
  expect(boxes.timeLeft).toBeGreaterThan(boxes.inputRight);
  const dateShadow = await shadowOf(page, "#time-date");
  expect(dateShadow).toContain("3px");
  await expect(page.locator("#time-picker")).toHaveCSS("box-shadow", "none");
  // The time companions are separate controls: no ring while unfocused.
  await expect(page.locator("#time-start")).toHaveCSS("box-shadow", "none");
});

test("range bounds keep per-bound focus on their own box", async ({ page }) => {
  await page.locator("#stay-start").focus();
  const boundShadow = await shadowOf(page, "#stay-start");
  expect(boundShadow).toContain("3px");
  await expect(page.locator("#stay-end")).toHaveCSS("box-shadow", "none");
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

test("Escape returns focus to the trigger that opened the popover", async ({ page }) => {
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await page.focus("#simple-picker .dp-picker-button");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeHidden();
  await expect(page.locator("#simple-picker .dp-picker-button")).toBeFocused();
});

test("Escape returns focus to the field that opened the popover", async ({ page }) => {
  await page.locator("#simple-date").focus();
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#simple-date")).toBeFocused();
});

test("selecting a date returns focus to the trigger that opened the popover", async ({ page }) => {
  await page.focus("#simple-picker .dp-picker-button");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  await expect(page.locator("#simple-picker .dp-picker-button")).toBeFocused();
});

test("Enter on an open trigger moves into the grid; ArrowDown on it reopens", async ({ page }) => {
  await page.locator("#simple-date").focus();
  await expect(page.locator("#simple-picker .dp-picker-panel")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("#simple-picker .dp-picker-button")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await page.keyboard.press("Escape");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
  // Opened by the field, so Escape returns there.
  await expect(page.locator("#simple-date")).toBeFocused();
  // ArrowDown on the trigger then opens and enters the grid.
  await page.focus("#simple-picker .dp-picker-button");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await expect(page.locator('#simple-picker .dp-day[tabindex="0"]')).toBeFocused();
});

test("mouse click on the open trigger still closes the popover", async ({ page }) => {
  await page.click("#simple-picker .dp-picker-button");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", true);
  await page.click("#simple-picker .dp-picker-button");
  await expect(page.locator("#simple-picker")).toHaveJSProperty("open", false);
});

test("Tab reaches the field, then its own trigger, then the next control", async ({ page }) => {
  await page.locator("#time-date").focus();
  await expect(page.locator("#time-picker .dp-picker-panel")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.locator("#time-picker .dp-picker-button")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#time-start")).toBeFocused();
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
