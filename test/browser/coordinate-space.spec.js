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
      space: picker.coordinateSpace,
      position: panel.style.position,
      styleTop: Number.parseFloat(panel.style.top),
      gap: panelRect.top - hostRect.bottom,
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

test("default is viewport: fixed panel attached below the host", async ({ page }) => {
  const state = await openState(page, "flow-picker");
  expect(state.space).toBe("viewport");
  expect(state.position).toBe("fixed");
  expect(state.styleTop).toBeCloseTo(state.hostBottom + 4, 0);
  expect(state.gap).toBeCloseTo(4, 0);
  await closePicker(page, "flow-picker");
});

test("explicit document: absolute panel with scroll-origin coordinates", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("flow-picker").coordinateSpace = "document";
  });
  // Small scroll keeps the host inside the viewport boundary so
  // reposition() can measure; the scroll offset must still be baked
  // into the absolute document coordinates.
  await page.evaluate(() => window.scrollTo(0, 60));
  const state = await openState(page, "flow-picker");
  expect(state.space).toBe("document");
  expect(state.position).toBe("absolute");
  expect(state.styleTop).toBeCloseTo(state.scrollY + state.hostBottom + 4, 0);
  expect(state.gap).toBeCloseTo(4, 0);
  await closePicker(page, "flow-picker");
});

test("invalid value falls back to viewport", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("flow-picker").coordinateSpace = "nonsense";
  });
  const state = await openState(page, "flow-picker");
  expect(state.space).toBe("viewport");
  expect(state.position).toBe("fixed");
  await closePicker(page, "flow-picker");
});

test("coordinate space is frozen per opening", async ({ page }) => {
  const opened = await openState(page, "flow-picker");
  expect(opened.position).toBe("fixed");
  const midOpen = await page.evaluate(() => {
    const picker = /** @type {any} */ (document.getElementById("flow-picker"));
    picker.coordinateSpace = "document";
    const panel = picker.querySelector(".dp-picker-panel");
    return panel.style.position;
  });
  // Changing the property while open must not move the current opening.
  expect(midOpen).toBe("fixed");
  await closePicker(page, "flow-picker");
  const reopened = await openState(page, "flow-picker");
  expect(reopened.space).toBe("document");
  expect(reopened.position).toBe("absolute");
  await closePicker(page, "flow-picker");
});
