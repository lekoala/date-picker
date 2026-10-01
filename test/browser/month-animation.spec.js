import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.__monthAnimations = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.matches("#inline .dp-grid")) {
        window.__monthAnimations.push({ frames, options, role: this.getAttribute("role") });
      }
      return animate.call(this, frames, options);
    };
  });
  await page.goto("/demo/index.html");
});

test("month controls animate only the grid in the navigation direction", async ({ page }) => {
  expect(await page.evaluate(() => window.__monthAnimations)).toEqual([]);
  await page.locator("#inline .dp-next").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inline .dp-next")).toBeFocused();
  await page.locator("#inline .dp-prev").click();
  await page.selectOption("#inline .dp-month-select", "12");
  await page.fill("#inline .dp-year-input", "2025");
  await page.locator("#inline .dp-year-input").blur();

  const animations = await page.evaluate(() => window.__monthAnimations);
  expect(animations.map((animation) => animation.frames[0].translate)).toEqual([
    "0 0.5rem",
    "0 -0.5rem",
    "0 0.5rem",
    "0 -0.5rem",
  ]);
  for (const animation of animations) {
    expect(animation.role).toBe("grid");
    expect(animation.frames.map((frame) => frame.opacity)).toEqual([0, 1]);
    expect(animation.frames[1].translate).toBe("0 0");
    expect(animation.options.duration).toBe(180);
  }
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
  await expect(page.locator('#inline .dp-day[tabindex="0"]')).toHaveCount(1);
});

test("keyboard month changes animate without activating or selecting", async ({ page }) => {
  await page.evaluate(() => {
    window.__activations = [];
    document.getElementById("inline").addEventListener("dateactivate", (event) => {
      window.__activations.push(event.detail.date);
    });
  });
  await page.locator('#inline .dp-day[data-date="2026-09-30"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('#inline .dp-day[data-date="2026-10-01"]')).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(page.locator('#inline .dp-day[data-date="2026-09-01"]')).toBeFocused();
  expect(
    await page.evaluate(() => window.__monthAnimations.map((animation) => animation.frames[0].translate)),
  ).toEqual(["0 0.5rem", "0 -0.5rem"]);
  expect(await page.evaluate(() => window.__activations)).toEqual([]);
  await expect(page.locator("#inline")).toHaveAttribute("value", "2026-09-10");
});

test("same-month rendering and reduced motion do not start animations", async ({ page }) => {
  await page.evaluate(() => {
    const calendar = document.getElementById("inline");
    calendar.render(false);
    calendar.value = "2026-09-12";
  });
  expect(await page.evaluate(() => window.__monthAnimations)).toEqual([]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#inline .dp-next").click();
  await expect(page.locator("#inline")).toHaveAttribute("display", "2026-10");
  expect(await page.evaluate(() => window.__monthAnimations)).toEqual([]);
});

test("rapid navigation replaces the grid and fixed weeks keep its height stable", async ({ page }) => {
  const state = await page.evaluate(() => {
    const calendar = document.getElementById("inline");
    const heights = [];
    const rows = [];
    const grids = [];
    for (const display of ["2026-11", "2026-12", "2027-01"]) {
      calendar.display = display;
      const grid = calendar.querySelector(".dp-grid");
      heights.push(grid.getBoundingClientRect().height);
      rows.push(grid.querySelectorAll("tbody tr").length);
      grids.push(grid);
    }
    return {
      heights,
      rows,
      connected: grids.map((grid) => grid.isConnected),
      activeAnimations: grids.at(-1).getAnimations().length,
      starts: window.__monthAnimations.length,
    };
  });
  expect(state.rows).toEqual([6, 6, 6]);
  expect(new Set(state.heights).size).toBe(1);
  expect(state.connected).toEqual([false, false, true]);
  expect(state.activeAnimations).toBe(1);
  expect(state.starts).toBe(3);
});
