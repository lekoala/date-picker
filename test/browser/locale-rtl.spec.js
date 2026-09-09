import { expect, test } from "@playwright/test";

test.describe("locale month/year order", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/index.html");
  });

  test("controls follow the Intl order and stay independent of direction", async ({ page }) => {
    const order = await page.evaluate(() => {
      const make = (locale) => {
        const element = document.createElement("date-calendar");
        element.setAttribute("display", "2026-09");
        element.setAttribute("locale", locale);
        document.body.append(element);
        const month = element.querySelector(".dp-month-select");
        const year = element.querySelector(".dp-year-input");
        const result = {
          yearFirst: element.hasAttribute("data-year-first"),
          monthBeforeYear: Boolean(month.compareDocumentPosition(year) & 4),
        };
        element.remove();
        return result;
      };
      return { en: make("en-US"), ja: make("ja") };
    });
    expect(order.en).toEqual({ yearFirst: false, monthBeforeYear: true });
    expect(order.ja).toEqual({ yearFirst: true, monthBeforeYear: false });
  });

  test("year-first keeps the flexible track under the month select", async ({ page }) => {
    await page.evaluate(() => {
      const element = document.createElement("date-calendar");
      element.id = "year-first";
      element.setAttribute("display", "2026-09");
      element.setAttribute("locale", "ja");
      document.body.append(element);
    });
    await expect(page.locator("#year-first")).toHaveAttribute("data-year-first", "");
    const columns = await page
      .locator("#year-first .dp-calendar-header")
      .evaluate((header) => getComputedStyle(header).gridTemplateColumns);
    const tracks = columns.trim().split(/\s+/);
    expect(tracks).toHaveLength(4);
    const widths = await page.evaluate(() => {
      const element = document.getElementById("year-first");
      const month = element.querySelector(".dp-month-select").getBoundingClientRect();
      const year = element.querySelector(".dp-year-input").getBoundingClientRect();
      return { monthX: month.x, monthWidth: month.width, yearX: year.x, yearWidth: year.width };
    });
    expect(widths.yearX).toBeLessThan(widths.monthX);
    expect(widths.monthWidth).toBeGreaterThan(widths.yearWidth);
  });
});

test.describe("rtl", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/index.html");
    await page.evaluate(() => {
      document.documentElement.dir = "rtl";
    });
  });

  test("previous sits right of next with mirrored glyphs; actions stay chronological", async ({ page }) => {
    await page.evaluate(() => {
      const element = document.createElement("date-calendar");
      element.id = "rtl-cal";
      element.setAttribute("display", "2026-09");
      document.body.append(element);
    });
    const prevBox = await page.locator("#rtl-cal .dp-prev").boundingBox();
    const nextBox = await page.locator("#rtl-cal .dp-next").boundingBox();
    expect(prevBox.x).toBeGreaterThan(nextBox.x);
    const transform = await page
      .locator("#rtl-cal .dp-prev svg")
      .evaluate((svg) => getComputedStyle(svg).transform);
    expect(transform).not.toBe("none");

    await page.locator("#rtl-cal .dp-prev").click();
    await expect(page.locator("#rtl-cal")).toHaveAttribute("display", "2026-08");
    await page.locator("#rtl-cal .dp-next").click();
    await expect(page.locator("#rtl-cal")).toHaveAttribute("display", "2026-09");
  });

  test("grid columns mirror with aligned headers; arrows stay chronological", async ({ page }) => {
    await page.evaluate(() => {
      const element = document.createElement("date-calendar");
      element.id = "rtl-grid";
      element.setAttribute("display", "2026-09");
      document.body.append(element);
    });
    const cells = await page
      .locator("#rtl-grid tbody tr:first-child .dp-day")
      .evaluateAll((days) =>
        days.map((day) => ({ date: day.dataset.date, x: Math.round(day.getBoundingClientRect().x) })),
      );
    expect(cells.map((cell) => cell.date)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ]);
    const xs = cells.map((cell) => cell.x);
    expect([...xs].sort((a, b) => b - a)).toEqual(xs);
    await expect(page.locator("#rtl-grid thead th")).toHaveCount(7);

    await page.locator('#rtl-grid .dp-day[data-date="2026-09-10"]').focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("#rtl-grid")).toHaveJSProperty("focusedDate", "2026-09-09");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#rtl-grid")).toHaveJSProperty("focusedDate", "2026-09-10");
  });

  test("popup opens in RTL and the arabic locale renders", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.evaluate(() => {
      const picker = document.createElement("date-picker");
      picker.id = "rtl-picker";
      picker.setAttribute("locale", "ar");
      const input = document.createElement("input");
      input.name = "date";
      picker.append(input);
      document.body.append(picker);
    });
    await page.locator("#rtl-picker").evaluate((picker) => picker.show());
    await expect(page.locator("#rtl-picker .dp-picker-panel")).toBeVisible();
    const firstMonth = await page.locator("#rtl-picker .dp-month-select option").first().textContent();
    expect(firstMonth).toMatch(/[\u0600-\u06FF]/);
    expect(errors).toEqual([]);
  });
});
