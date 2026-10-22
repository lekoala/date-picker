import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("default skin retains its border, radius, caret and dimensions", async ({ page }) => {
  const month = page.locator("#inline .dp-month-select");
  await expect(month).toHaveClass(/dp-skin/);
  await expect(month).toHaveCSS("border-top-width", "1px");
  await expect(month).toHaveCSS("border-top-left-radius", "6px");
  await expect(month).toHaveCSS("background-image", /linear-gradient/);
  const sizes = await page
    .locator("#inline .dp-calendar-header")
    .evaluate((header) =>
      [...header.querySelectorAll("select, input, button")].map((el) => el.getBoundingClientRect().height),
    );
  expect(new Set(sizes).size).toBe(1);
});

test("arbitrary utility classes survive HTML rendering without injecting markup or attributes", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const calendar = document.querySelector("#inline");
    const tokens = [
      "btn",
      "[&>svg]:size-4",
      "data-[state=open]:bg-muted",
      "aria-[disabled=true]:opacity-50",
      '"><img/src=x/onerror=alert(1)>',
      "content-['x']",
      "back`tick",
      "a&quot;b",
    ];
    const value = tokens.join(" ");
    calendar.controlClasses = { month: value, year: value, nav: value };
    const controls = [
      ...calendar.querySelectorAll(".dp-calendar-header select, .dp-calendar-header input, .dp-nav"),
    ];
    return {
      tokens,
      classes: controls.map((el) => [...el.classList].filter((token) => !token.startsWith("dp-"))),
      injected: calendar.querySelectorAll("img, [onclick], [onerror]").length,
    };
  });
  expect(result.classes).toHaveLength(4);
  for (const classes of result.classes) expect(classes).toEqual(result.tokens);
  expect(result.injected).toBe(0);
});

test("equivalent class assignments retain the grid, controls and focus", async ({ page }) => {
  const result = await page.evaluate(() => {
    const elements = [document.querySelector("#inline"), document.querySelector("#simple-picker")];
    return elements.map((element) => {
      element.controlClasses = { month: "host select", year: "input", nav: "btn" };
      if (element.tagName === "DATE-PICKER") element.show({ moveFocus: false });
      const cell = element.querySelector(".dp-day");
      const year = element.querySelector(".dp-year-input");
      year.focus();
      element.controlClasses = { month: " host  select host ", year: "input", nav: "btn" };
      return {
        sameCell: cell === element.querySelector(".dp-day"),
        sameYear: year === element.querySelector(".dp-year-input"),
        focused: document.activeElement === year,
      };
    });
  });
  expect(result).toEqual([
    { sameCell: true, sameYear: true, focused: true },
    { sameCell: true, sameYear: true, focused: true },
  ]);
});

test("author skin survives rendering and focus restoration without changing selection", async ({ page }) => {
  await page.addStyleTag({
    content: `
    .x-select, .x-input, .x-nav { border: 3px solid red; border-radius: 0; padding: 4px; }
    .x-input { inline-size: 100%; }
    .x-select { background-image: none; }
    .x-nav { background: yellow; }
    .x-nav:focus-visible { outline: 4px solid red; }
  `,
  });
  await page.evaluate(() => {
    document.querySelector("#inline").controlClasses = {
      month: 'x-select a&b bad" onclick="alert(1)',
      year: "x-input",
      nav: "x-nav",
    };
  });
  const month = page.locator("#inline .dp-month-select");
  const year = page.locator("#inline .dp-year-input");
  const next = page.locator("#inline .dp-next");
  await expect(month).toHaveCSS("border-top-width", "3px");
  await expect(month).toHaveCSS("background-image", "none");
  await expect(month).toHaveClass(/a&b/);
  await expect(month).not.toHaveAttribute("onclick");
  await expect(page.locator("#inline .dp-calendar-header .dp-skin")).toHaveCount(0);
  await next.focus();
  await next.press("Enter");
  await expect(next).toBeFocused();
  await year.focus();
  await year.press("ArrowUp");
  await year.press("Enter");
  await expect(year).toBeFocused();
  await month.focus();
  await month.selectOption("02");
  await expect(month).toBeFocused();
  await page.locator("#inline").evaluate((el) => {
    el.locale = "ja-JP";
  });
  await expect(month).toBeFocused();
  await expect(month).toHaveClass(/x-select/);
  await expect(year).toHaveClass(/x-input/);
  await expect(next).toHaveClass(/x-nav/);
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
  const layout = await page.locator("#inline .dp-calendar-header").evaluate((header) => {
    const controls = [...header.querySelectorAll("select, input, button")];
    return {
      heights: controls.map((el) => el.getBoundingClientRect().height),
      year: header.querySelector("input").getBoundingClientRect().width,
      expectedYear: parseFloat(getComputedStyle(document.documentElement).fontSize) * 5.5,
      overflow: getComputedStyle(header.querySelector("select")).textOverflow,
    };
  });
  expect(new Set(layout.heights).size).toBe(1);
  expect(layout.year).toBeCloseTo(layout.expectedYear, 0);
  expect(layout.overflow).toBe("ellipsis");
  await next.focus();
  await expect(next).toHaveCSS("outline-width", "4px");
  await next.hover();
  await expect(next).toHaveCSS("background-color", "rgb(255, 255, 0)");
  await page.locator("#inline").evaluate((el) => {
    el.min = `${el.display}-01`;
    el.max = `${el.display}-28`;
  });
  await expect(next).toBeDisabled();
  await expect(next).toHaveCSS("opacity", "1");
  await expect(month).toHaveClass(/x-select/);
  await expect(year).toHaveClass(/x-input/);
});

test("forced colors preserve the host skin and focus ring", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "forced-colors assertions follow the Chromium capture pipeline");
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/test/fixtures/control-classes.html");
  const month = page.locator(".host-select");
  await expect(month).toHaveCSS("border-top-width", "3px");
  await expect(month).toHaveCSS("border-top-left-radius", "0px");
  await month.focus();
  await expect(month).toHaveCSS("outline-width", "3px");
  await expect(month).toHaveCSS("outline-offset", "2px");
  await expect(page.locator(".dp-calendar-header .dp-skin")).toHaveCount(0);
});

test("global defaults and picker overrides reach single and shared range calendars", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { setDefaultControlClasses } = await import("/src/index.js");
    setDefaultControlClasses({ month: "global-month", year: "global-year", nav: "global-nav" });
    const calendar = document.createElement("date-calendar");
    document.body.append(calendar);
    const makePicker = (range) => {
      const picker = document.createElement("date-picker");
      if (range) picker.setAttribute("range", "");
      picker.innerHTML = range ? "<input data-range-start><input data-range-end>" : "<input>";
      document.body.append(picker);
      return picker;
    };
    const single = makePicker(false);
    const range = makePicker(true);
    const globals = [calendar, single, range].map((el) => el.querySelector(".global-month") !== null);
    single.controlClasses = { month: "local-month", nav: "" };
    range.controlClasses = { year: "local-year" };
    return {
      globals,
      local: !!single.querySelector(".local-month"),
      inherited: !!single.querySelector(".global-year"),
      skin: single.querySelectorAll(".dp-nav.dp-skin").length,
      range: !!range.querySelector(".local-year"),
    };
  });
  expect(result).toEqual({ globals: [true, true, true], local: true, inherited: true, skin: 2, range: true });
});
