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

test("first-day=7 aligns the grid exactly like first-day=0", async ({ page }) => {
  const layout = await page.evaluate(() => {
    const make = (attr) => {
      const element = document.createElement("date-calendar");
      element.setAttribute("display", "2026-09");
      element.setAttribute("fixed-weeks", "");
      element.setAttribute("first-day", attr);
      document.body.append(element);
      const headers = [...element.querySelectorAll(".dp-grid thead th")].map((th) => th.textContent?.trim());
      return {
        headers,
        firstCell: element.querySelector(".dp-day[data-date]")?.getAttribute("data-date"),
      };
    };
    return { monday: make("1"), sunday: make("0"), iso: make("7") };
  });
  expect(layout.iso.headers).toEqual(layout.sunday.headers);
  expect(layout.iso.firstCell).toBe(layout.sunday.firstCell);
  expect(layout.iso.firstCell).toBe("2026-08-30");
  expect(layout.iso.headers).not.toEqual(layout.monday.headers);
});

test("show-week-numbers renders only in a Monday-first grid", async ({ page }) => {
  const counts = await page.evaluate(() => {
    const make = (attr) => {
      const element = document.createElement("date-calendar");
      element.setAttribute("display", "2026-09");
      element.setAttribute("fixed-weeks", "");
      element.setAttribute("show-week-numbers", "");
      element.setAttribute("first-day", attr);
      document.body.append(element);
      return {
        weekNumber: element.querySelectorAll(".dp-week-number").length,
        header: element.querySelectorAll(".dp-week-heading").length,
      };
    };
    return { monday: make("1"), sunday: make("0"), iso: make("7") };
  });
  expect(counts.monday.weekNumber).toBeGreaterThan(0);
  expect(counts.monday.header).toBe(1);
  expect(counts.sunday).toEqual({ weekNumber: 0, header: 0 });
  expect(counts.iso).toEqual({ weekNumber: 0, header: 0 });
});

test("the grid heading is visually hidden but keeps naming and the live region", async ({ page }) => {
  const heading = page.locator("#inline .dp-calendar-heading");
  const grid = page.locator("#inline .dp-grid");
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveClass(/dp-visually-hidden/);
  await expect(heading).toHaveCSS("position", "absolute");
  await expect(heading).toHaveAttribute("aria-live", "polite");
  const labelledBy = await grid.getAttribute("aria-labelledby");
  expect(labelledBy).toBeTruthy();
  await expect(page.locator(`#inline #${labelledBy}`)).toHaveClass(/dp-calendar-heading/);
});

test("the agenda anchor renders a visual marker and moves on activation", async ({ page }) => {
  const anchorCell = page.locator('#mini .dp-day[data-date="2026-09-03"] .availability i.anchor');
  await expect(anchorCell).toHaveCount(1);
  await page.click('#mini .dp-day[data-date="2026-09-10"]');
  await expect(page.locator('#mini .dp-day[data-date="2026-09-10"] .availability i.anchor')).toHaveCount(1);
  await expect(anchorCell).toHaveCount(0);
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

test("ArrowLeft across a month boundary keeps DOM focus on the new date with fixed-weeks", async ({
  page,
}) => {
  await page.evaluate(() => {
    const element = document.createElement("date-calendar");
    element.id = "edge";
    element.setAttribute("display", "2026-10");
    element.setAttribute("fixed-weeks", "");
    document.body.append(element);
  });
  await page.locator('#edge .dp-day[data-date="2026-10-01"]').focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#edge")).toHaveJSProperty("focusedDate", "2026-09-30");
  await expect(page.locator("#edge")).toHaveAttribute("display", "2026-09");
  await expect(page.locator('#edge .dp-day[data-date="2026-09-30"]')).toBeFocused();
});

test("month/year controls render at equal heights in a compact header", async ({ page }) => {
  await page.evaluate(() => {
    const element = document.createElement("date-calendar");
    element.id = "compact-header";
    element.setAttribute("display", "2026-09");
    element.style.setProperty("--dp-header-control-size", "1.875rem");
    document.body.append(element);
  });
  const heights = await page.evaluate(() => {
    const element = document.getElementById("compact-header");
    const height = (selector) => Math.round(element.querySelector(selector).getBoundingClientRect().height);
    return { month: height(".dp-month-select"), year: height(".dp-year-input"), prev: height(".dp-prev") };
  });
  expect(Math.abs(heights.month - heights.year)).toBeLessThanOrEqual(1);
  expect(Math.abs(heights.month - heights.prev)).toBeLessThanOrEqual(1);
});

test("month select truncates long names with an ellipsis instead of painting under the caret", async ({
  page,
}) => {
  await page.evaluate(() => {
    const element = document.createElement("date-calendar");
    element.id = "narrow-month";
    element.setAttribute("display", "2026-09");
    element.setAttribute("locale", "fr-BE");
    element.style.setProperty("--dp-year-inline-size", "4.25rem");
    element.style.setProperty("max-inline-size", "228px");
    document.body.append(element);
  });
  const select = page.locator("#narrow-month .dp-month-select");
  // WebKit forces overflow: visible on menulists, so the ellipsis cannot
  // engage there; the declaration is still locked everywhere.
  if (test.info().project.name !== "webkit") {
    await expect(select).toHaveCSS("overflow", /^(hidden|clip)$/);
  }
  await expect(select).toHaveCSS("text-overflow", "ellipsis");
});

test('month-format="short" abbreviates the month select but keeps the long heading', async ({ page }) => {
  const names = await page.evaluate(() => {
    const make = (format) => {
      const element = document.createElement("date-calendar");
      element.setAttribute("display", "2026-09");
      element.setAttribute("locale", "fr-BE");
      if (format) element.setAttribute("month-format", format);
      document.body.append(element);
      const result = {
        options: [...element.querySelectorAll(".dp-month-select option")].map((o) => o.textContent),
        heading: element.querySelector(".dp-calendar-heading").textContent,
        api: element.monthFormat,
      };
      element.remove();
      return result;
    };
    const september = (style) =>
      new Intl.DateTimeFormat("fr-BE", { calendar: "gregory", month: style, timeZone: "UTC" }).format(
        new Date(Date.UTC(2026, 8, 15)),
      );
    const dynamic = (() => {
      const element = document.createElement("date-calendar");
      element.setAttribute("display", "2026-09");
      element.setAttribute("locale", "fr-BE");
      document.body.append(element);
      const before = element.querySelector('.dp-month-select option[value="09"]').textContent;
      element.setAttribute("month-format", "short");
      const after = element.querySelector('.dp-month-select option[value="09"]').textContent;
      element.remove();
      return { before, after };
    })();
    return {
      long: make(),
      short: make("short"),
      bogus: make("banana"),
      dynamic,
      septemberLong: september("long"),
      septemberShort: september("short"),
    };
  });
  expect(names.long.api).toBe("long");
  expect(names.long.options[8]).toBe(names.septemberLong);
  expect(names.short.api).toBe("short");
  expect(names.short.options[8]).toBe(names.septemberShort);
  expect(names.short.options[8]).not.toBe(names.septemberLong);
  expect(names.short.heading).toContain(names.septemberLong);
  expect(names.bogus.api).toBe("long");
  expect(names.bogus.options[8]).toBe(names.septemberLong);
  expect(names.dynamic.before).toBe(names.septemberLong);
  expect(names.dynamic.after).toBe(names.septemberShort);
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

test("range endpoints keep their contrasting background on hover", async ({ page }) => {
  await page.evaluate(() => {
    document.querySelector("#stay-calendar").highlightedRange = {
      start: "2026-09-10",
      end: "2026-09-15",
    };
  });
  for (const date of ["2026-09-10", "2026-09-15"]) {
    await page.mouse.move(0, 0);
    const cell = page.locator(`#stay-calendar .dp-day[data-date="${date}"]`);
    const background = await cell.evaluate((element) => getComputedStyle(element).backgroundColor);
    const foreground = await cell.evaluate((element) => getComputedStyle(element).color);
    await cell.hover();
    await expect(cell).toHaveCSS("background-color", background);
    await expect(cell).toHaveCSS("color", foreground);
  }
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
