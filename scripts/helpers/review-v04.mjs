/** Reproduce v0.4 release-review edge cases across desktop engines. */
import { chromium, firefox, webkit } from "playwright";
import { startServer } from "./server.js";

const server = await startServer();
try {
  for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
    if (process.argv[2] && process.argv[2] !== engine) continue;
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${server.baseURL}/demo/index.html`);
      await page.evaluate(() => {
        const picker = document.getElementById("stay-picker");
        picker.range = { start: "2026-09-10", end: "2026-09-15" };
        picker.addEventListener("dateactivate", (event) => event.preventDefault());
      });
      await page.locator("#stay-start").focus();
      const day = (date) => page.locator(`#stay-picker .dp-day[data-date="${date}"]`);
      const from = await day("2026-09-10").boundingBox();
      const to = await day("2026-09-07").boundingBox();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(100);
      const cancelledDrop = await page.evaluate(() => {
        const picker = document.getElementById("stay-picker");
        const calendar = picker.querySelector("date-calendar");
        return {
          range: picker.range,
          band: calendar.highlightedRange,
          preview: calendar.hasAttribute("data-range-preview"),
          drag: calendar.getAttribute("data-range-drag"),
        };
      });
      await page.evaluate(() => document.getElementById("stay-picker").hide());
      await page.goto(`${server.baseURL}/test/fixtures/range.html`);
      const previewLabels = await page.evaluate(async () => {
        const picker = document.getElementById("range-picker");
        picker.range = { start: "2026-09-10", end: "" };
        picker.show();
        await new Promise((resolve) => setTimeout(resolve, 100));
        const calendar = picker.querySelector("date-calendar");
        const cell = calendar.querySelector('[data-date="2026-09-10"]');
        const before = cell.getAttribute("aria-label");
        cell.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
        const during = cell.getAttribute("aria-label");
        const preview = calendar.hasAttribute("data-range-preview");
        picker.hide();
        return { before, during, preview };
      });
      await page.goto(`${server.baseURL}/demo/index.html`);
      const bounds = await page.evaluate(() => {
        const calendar = document.getElementById("inline");
        calendar.firstDay = 0;
        calendar.display = "0001-01";
        const initial = { display: calendar.display, focusedDate: calendar.focusedDate };
        calendar.focusedDate = "0001-01-01";
        return {
          initial,
          display: calendar.display,
          focusedDate: calendar.focusedDate,
          roving: calendar.querySelectorAll('.dp-day[tabindex="0"]').length,
        };
      });
      const boundaryNavigation = await page.evaluate(() => {
        const calendar = document.getElementById("inline");
        calendar.firstDay = 1;
        calendar.display = "0001-01";
        try {
          calendar.previousMonth();
          return "ok";
        } catch (error) {
          return error.message;
        }
      });
      console.log(
        JSON.stringify({ engine, cancelledDrop, previewLabels, bounds, boundaryNavigation, errors }),
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.stop();
}
