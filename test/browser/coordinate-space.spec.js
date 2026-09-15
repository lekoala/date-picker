import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/position.html");
});

async function openState(page, id) {
  return page.evaluate((pickerId) => {
    const picker = /** @type {any} */ (document.getElementById(pickerId));
    picker.show();
    const panel = picker.querySelector(".dp-picker-panel");
    const hostRect = picker.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return {
      space: picker._resolvedCoordinateSpace,
      position: panel.style.position,
      styleTop: Number.parseFloat(panel.style.top),
      gap: panelRect.top - hostRect.bottom,
      gapAbove: hostRect.top - panelRect.bottom,
      hostBottom: hostRect.bottom,
      scrollY: window.scrollY,
    };
  }, id);
}

async function closePicker(page, id) {
  await page.evaluate((pickerId) => {
    document.getElementById(pickerId).hide();
  }, id);
}

test("flow + auto resolves document + absolute with scroll-origin coordinates", async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 200));
  const state = await openState(page, "flow-picker");
  expect(state.space).toBe("document");
  expect(state.position).toBe("absolute");
  expect(state.styleTop).toBeCloseTo(state.scrollY + state.hostBottom + 4, 0);
  expect(state.gap).toBeCloseTo(4, 0);
  await closePicker(page, "flow-picker");
});

test("flow + forced viewport stays fixed through scrolling", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("flow-picker").coordinateSpace = "viewport";
  });
  const state = await openState(page, "flow-picker");
  expect(state.space).toBe("viewport");
  expect(state.position).toBe("fixed");
  expect(state.styleTop).toBeCloseTo(state.hostBottom + 4, 0);
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(150);
  const gap = await page.evaluate(() => {
    const picker = document.getElementById("flow-picker");
    const panel = picker.querySelector(".dp-picker-panel");
    return panel.getBoundingClientRect().top - picker.getBoundingClientRect().bottom;
  });
  expect(gap).toBeCloseTo(4, 0);
  await closePicker(page, "flow-picker");
});

test("unstuck sticky + auto resolves viewport + fixed", async ({ page }) => {
  const state = await openState(page, "sticky-picker");
  expect(state.space).toBe("viewport");
  expect(state.position).toBe("fixed");
  expect(state.gap).toBeCloseTo(4, 0);
  await closePicker(page, "sticky-picker");
});

test("sticky + forced document resolves document + absolute", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("sticky-picker").coordinateSpace = "document";
  });
  const state = await openState(page, "sticky-picker");
  expect(state.space).toBe("document");
  expect(state.position).toBe("absolute");
  await closePicker(page, "sticky-picker");
});

test("fixed + auto resolves viewport + fixed", async ({ page }) => {
  const state = await openState(page, "fixed-picker");
  expect(state.space).toBe("viewport");
  expect(state.position).toBe("fixed");
  // No room below the fixed box: the panel flips above, still attached.
  expect(Math.min(Math.abs(state.gap - 4), Math.abs(state.gapAbove - 4))).toBeLessThan(3);
  await closePicker(page, "fixed-picker");
});

test("modal dialog + auto resolves viewport + fixed", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("position-dialog").showModal();
  });
  const state = await openState(page, "dialog-picker");
  expect(state.space).toBe("viewport");
  expect(state.position).toBe("fixed");
  // The dialog centers the picker: the panel may flip above, still attached.
  expect(Math.min(Math.abs(state.gap - 4), Math.abs(state.gapAbove - 4))).toBeLessThan(3);
  await closePicker(page, "dialog-picker");
});
