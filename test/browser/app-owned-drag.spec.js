import { expect, test } from "@playwright/test";

// Contract for DECISIONS D9: an application moves a range bound with the
// public API only. This spec protects the seams the recipe relies on
// (data-date, data-range-start/end, activateDate + dateactivate, range,
// native input/change) and the five guarantees the removed drag offered.

test.describe("app-owned endpoint drag", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test/fixtures/app-owned-drag.html");
    await page.evaluate(() => {
      document.getElementById("app-drag").show();
    });
    await expect(page.locator("#app-drag .dp-picker-panel")).toBeVisible();
  });

  const cell = (page, date) => page.locator(`#app-drag .dp-day[data-date="${date}"]`);

  const drag = async (page, from, to) => {
    const source = await cell(page, from).boundingBox();
    const target = await cell(page, to).boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 5 });
    await page.mouse.up();
  };

  test("moving the start handle writes the pair and fires only the moved bound", async ({ page }) => {
    await drag(page, "2026-09-10", "2026-09-06");
    const state = await page.evaluate(() => ({
      range: document.getElementById("app-drag").range,
      events: window.appDrag.events,
    }));
    expect(state.range).toEqual({ start: "2026-09-06", end: "2026-09-15" });
    expect(state.events.filter(([name]) => name === "rangechange")).toHaveLength(1);
    expect(state.events).toContainEqual(["start:input"]);
    expect(state.events).toContainEqual(["start:change"]);
    expect(state.events.some(([name]) => name.startsWith("end:"))).toBe(false);
  });

  test("a slow source writes nothing until availability resolves", async ({ page }) => {
    await page.evaluate(() => {
      const picker = document.getElementById("app-drag");
      picker.source = async (_range, { signal }) => {
        await new Promise((resolve, reject) => {
          window.__release = resolve;
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true,
          });
        });
        return { dates: {} };
      };
    });
    await drag(page, "2026-09-10", "2026-09-06");
    const state = await page.evaluate(() => ({
      range: document.getElementById("app-drag").range,
      events: window.appDrag.events,
    }));
    expect(state.range).toEqual({ start: "2026-09-10", end: "2026-09-15" });
    expect(state.events.filter(([name]) => name === "rangechange")).toHaveLength(0);

    await page.evaluate(() => window.__release());
    await expect
      .poll(() => page.evaluate(() => document.getElementById("app-drag").range))
      .toEqual({ start: "2026-09-06", end: "2026-09-15" });
  });

  test("a cancelled dateactivate leaves the range untouched", async ({ page }) => {
    await page.evaluate(() => {
      document
        .getElementById("app-drag")
        .calendar.addEventListener("dateactivate", (event) => event.preventDefault(), { once: true });
    });
    await drag(page, "2026-09-10", "2026-09-06");
    const state = await page.evaluate(() => ({
      range: document.getElementById("app-drag").range,
      events: window.appDrag.events,
    }));
    expect(state.range).toEqual({ start: "2026-09-10", end: "2026-09-15" });
    expect(state.events.filter(([name]) => name === "rangechange")).toHaveLength(0);
  });

  test("the older of two pending gestures never wins", async ({ page }) => {
    await page.evaluate(() => {
      const picker = document.getElementById("app-drag");
      picker.source = async (_range, { signal }) => {
        await new Promise((resolve, reject) => {
          window.__release = resolve;
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
            once: true,
          });
        });
        return { dates: {} };
      };
    });
    await drag(page, "2026-09-10", "2026-09-06");
    await drag(page, "2026-09-10", "2026-09-07");
    const before = await page.evaluate(() => window.appDrag.gesture());
    await page.evaluate(() => window.__release());
    await expect
      .poll(() => page.evaluate(() => document.getElementById("app-drag").range))
      .toEqual({ start: "2026-09-07", end: "2026-09-15" });
    const after = await page.evaluate(() => window.appDrag.gesture());
    expect(after).toBe(before);
  });

  test("pointercancel abandons the gesture", async ({ page }) => {
    const source = await cell(page, "2026-09-10").boundingBox();
    const target = await cell(page, "2026-09-06").boundingBox();
    await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
    await page.mouse.down();
    await page.evaluate(() => {
      document
        .getElementById("app-drag")
        .calendar.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1, bubbles: true }));
    });
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 3 });
    await page.mouse.up();
    const range = await page.evaluate(() => document.getElementById("app-drag").range);
    expect(range).toEqual({ start: "2026-09-10", end: "2026-09-15" });
  });
});
