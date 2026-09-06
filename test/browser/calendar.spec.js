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

test("Enter on prev/next keeps focus on the button across the re-render", async ({ page }) => {
  const prev = page.locator("#inline .dp-prev");
  await prev.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-08");
  await expect(prev).toBeFocused();
  const next = page.locator("#inline .dp-next");
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-09");
  await expect(next).toBeFocused();
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

test("Home and End move focus to week boundaries without selecting", async ({ page }) => {
  const selected = page.locator('#inline .dp-day[data-date="2026-09-10"]');
  await selected.focus();

  await page.keyboard.press("Home");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-07"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");

  await page.keyboard.press("End");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-13"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
});

test("PageUp/PageDown move focus across months and years without selecting", async ({ page }) => {
  const selected = page.locator('#inline .dp-day[data-date="2026-09-10"]');
  await selected.focus();

  await page.keyboard.press("PageUp");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-08");
  await expect(page.locator('#inline .dp-day[data-date="2026-08-10"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");

  await page.keyboard.press("PageDown");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-09");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-10"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");

  await page.keyboard.press("Shift+PageUp");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2025-09");
  await expect(page.locator('#inline .dp-day[data-date="2025-09-10"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");

  await page.keyboard.press("Shift+PageDown");
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-09");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-10"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
});

test("Space activates the focused day", async ({ page }) => {
  const selected = page.locator('#inline .dp-day[data-date="2026-09-10"]');
  await selected.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-11"]')).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
  await page.keyboard.press("Space");
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-11");
});

test("selection=none navigates a real calendar-view without acquiring a value", async ({ page }) => {
  await page.click('#mini .dp-day[data-date="2026-09-10"]');
  await expect(page.locator("#agenda")).toHaveAttribute("date", "2026-09-10");
  await expect(page.locator("#mini")).not.toHaveAttribute("value", /.+/);
});

test("outside-month days remain activatable in the mini calendar", async ({ page }) => {
  const outside = page.locator('#mini .dp-day[data-date="2026-08-31"]');
  await expect(outside).toHaveAttribute("data-outside-month", "true");
  await outside.click();
  await expect(page.locator("#agenda")).toHaveAttribute("date", "2026-08-31");
});

test("constraints disable prev/next and dim them visually", async ({ page }) => {
  const prev = page.locator("#constrained .dp-prev");
  const next = page.locator("#constrained .dp-next");
  await expect(prev).toBeDisabled();
  await expect(next).toBeDisabled();
  await expect(prev).toHaveCSS("opacity", "0.45");
  await expect(next).toHaveCSS("opacity", "0.45");
  await expect(page.locator("#inline .dp-prev")).toHaveCSS("opacity", "1");
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

test("forced colors keep selected, today and disabled days visually distinct", async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "forced-colors visual assertions follow the Chromium capture pipeline");
  await page.emulateMedia({ forcedColors: "active", colorScheme: "light" });

  const styles = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      const before = getComputedStyle(element, "::before");
      return {
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderColor: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        opacity: style.opacity,
        beforeBorderColor: before.borderTopColor,
        beforeBorderWidth: before.borderTopWidth,
      };
    };

    return {
      selected: read('#inline .dp-day[data-date="2026-09-10"]'),
      today: read('#inline .dp-day[data-date="2026-09-06"]'),
      disabled: read('#constrained .dp-day[data-date="2026-09-05"]'),
    };
  });

  expect(styles.selected).not.toBeNull();
  expect(styles.today).not.toBeNull();
  expect(styles.disabled).not.toBeNull();
  expect(styles.selected.borderWidth).toBe("2px");
  expect(styles.selected.beforeBorderWidth).toBe("1px");
  expect(styles.selected.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.selected.borderColor).toBe(styles.today.borderColor);
  expect(styles.selected.color).toBe(styles.selected.beforeBorderColor);
  expect(styles.disabled.opacity).toBe("1");
  expect(styles.disabled.color).not.toBe(styles.selected.color);
  expect(styles.disabled.color).not.toBe(styles.today.color);
});
