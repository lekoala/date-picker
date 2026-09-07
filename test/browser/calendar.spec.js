import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("fixed weeks is presentation while the inline calendar keeps one roving tab stop", async ({ page }) => {
  await page.fill("#inline .dp-year-input", "2021");
  await page.locator("#inline .dp-year-input").blur();
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

test("highlightedRange paints start, in-range and end cells without touching state", async ({ page }) => {
  await page.evaluate(() => {
    const calendar = document.getElementById("stay-calendar");
    calendar.highlightedRange = { start: "2026-09-10", end: "2026-09-15" };
  });
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-12"]')).toHaveAttribute(
    "data-in-range",
    "true",
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-15"]')).toHaveAttribute(
    "data-range-end",
    "true",
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-16"]')).not.toHaveAttribute(
    "data-range-end",
    /.+/,
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-13"]')).toHaveAttribute(
    "aria-label",
    /Dans la plage/,
  );
  await expect(page.locator("#stay-calendar")).not.toHaveAttribute("value", /.+/);
  await expect(page.locator("#stay-calendar")).not.toHaveAttribute("selection", "single");
});

test("highlightedRange accepts a start-only range and rejects inversions", async ({ page }) => {
  await page.evaluate(() => {
    const calendar = document.getElementById("stay-calendar");
    calendar.highlightedRange = { start: "2026-09-10", end: "" };
  });
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-11"]')).not.toHaveAttribute(
    "data-in-range",
    /.+/,
  );
  const rejected = await page.evaluate(() => {
    const calendar = document.getElementById("stay-calendar");
    try {
      calendar.highlightedRange = { start: "2026-09-20", end: "2026-09-15" };
      return false;
    } catch (error) {
      return error instanceof TypeError;
    }
  });
  expect(rejected).toBe(true);
});

test("a single-day highlightedRange renders both endpoints with a dedicated label", async ({ page }) => {
  await page.evaluate(() => {
    const calendar = document.getElementById("stay-calendar");
    calendar.highlightedRange = { start: "2026-09-10", end: "2026-09-10" };
  });
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-end",
    "true",
  );
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "aria-label",
    /Plage d’un jour/,
  );
});

test("forced colors keep a highlighted range band visually distinct", async ({ page, browserName }) => {
  test.skip(
    browserName !== "chromium",
    "forced-colors visual assertions follow the Chromium capture pipeline",
  );
  await page.emulateMedia({ forcedColors: "active", colorScheme: "light" });
  await page.evaluate(() => {
    const calendar = document.getElementById("stay-calendar");
    calendar.highlightedRange = { start: "2026-09-10", end: "2026-09-15" };
  });

  const styles = await page.evaluate(() => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        borderColor: style.borderTopColor,
        borderWidth: style.borderTopWidth,
        fontWeight: style.fontWeight,
      };
    };
    const readAfter = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) return null;
      const after = getComputedStyle(element, "::after");
      return {
        content: after.content,
        backgroundColor: after.backgroundColor,
        height: after.blockSize || after.height,
      };
    };
    return {
      start: read('#stay-calendar .dp-day[data-date="2026-09-10"]'),
      end: read('#stay-calendar .dp-day[data-date="2026-09-15"]'),
      middle: readAfter('#stay-calendar .dp-day[data-date="2026-09-12"]'),
    };
  });

  expect(styles.start).not.toBeNull();
  expect(styles.end).not.toBeNull();
  expect(styles.middle).not.toBeNull();
  expect(styles.start.borderWidth).toBe("2px");
  expect(styles.end.borderWidth).toBe("2px");
  expect(styles.start.borderColor).toBe(styles.end.borderColor);
  expect(styles.start.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.start.fontWeight).toBe("700");
  expect(styles.middle.content).toBe('""');
  expect(styles.middle.height).toBe("1px");
  expect(styles.middle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
});

test("constrained forced-colors endpoints inside a range keep readable contrast", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "forced-colors visual assertions follow the Chromium capture pipeline",
  );
  await page.emulateMedia({ forcedColors: "active", colorScheme: "light" });
  await page.evaluate(() => {
    const calendar = document.getElementById("stay-calendar");
    calendar.highlightedRange = { start: "2026-09-10", end: "2026-09-10" };
  });
  const endpoint = await page.evaluate(() => {
    const element = document.querySelector('#stay-calendar .dp-day[data-date="2026-09-10"]');
    if (!(element instanceof HTMLElement)) return null;
    const style = getComputedStyle(element);
    return { borderWidth: style.borderTopWidth, fontWeight: style.fontWeight };
  });
  expect(endpoint).not.toBeNull();
  expect(endpoint.borderWidth).toBe("2px");
  expect(endpoint.fontWeight).toBe("700");
});

test("inline range demo paints the band across two activations", async ({ page }) => {
  await page.click('#stay-calendar .dp-day[data-date="2026-09-10"]');
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-10"]')).toHaveAttribute(
    "data-range-start",
    "true",
  );
  await page.click('#stay-calendar .dp-day[data-date="2026-09-15"]');
  await expect(page.locator('#stay-calendar .dp-day[data-date="2026-09-12"]')).toHaveAttribute(
    "data-in-range",
    "true",
  );
  await expect(page.locator("#stay-state")).toContainText("2026-09-10 → 2026-09-15");
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
  test.skip(
    browserName !== "chromium",
    "forced-colors visual assertions follow the Chromium capture pipeline",
  );
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
  expect(styles.selected.borderColor).not.toBe(styles.today.borderColor);
  expect(styles.selected.borderWidth).not.toBe(styles.today.borderWidth);
  expect(styles.today.borderWidth).toBe("1px");
  expect(styles.today.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(styles.selected.color).toBe(styles.selected.beforeBorderColor);
  expect(styles.disabled.opacity).toBe("1");
  expect(styles.disabled.color).not.toBe(styles.selected.color);
  expect(styles.disabled.color).not.toBe(styles.today.color);
});
