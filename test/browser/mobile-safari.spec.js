import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/position.html");
});

test("touch opens from the field, commits a day and dismisses on an outside tap", async ({ page }) => {
  const picker = page.locator("#flow-picker");
  const input = picker.locator("#flow-date");
  const panel = picker.locator("[popover]");

  await input.tap();
  await expect(input).toBeFocused();
  await expect(panel).toBeVisible();
  await panel.locator('[data-date="2026-09-10"]').tap();
  await expect(panel).toBeHidden();
  await expect(input).toHaveValue("10/09/2026");
  await expect(picker.locator('input[type="hidden"][name="flow"]')).toHaveValue("2026-09-10");

  await picker.locator(".dp-picker-button").tap();
  await expect(panel).toBeVisible();
  await page.locator("main > p").tap();
  await expect(panel).toBeHidden();
  await expect(picker).toHaveAttribute("value", "2026-09-10");
});

for (const coordinateSpace of ["viewport", "document"]) {
  test(`the ${coordinateSpace} popup follows the field on scroll and fits the resized viewport`, async ({
    page,
  }) => {
    const picker = page.locator("#flow-picker");
    const panel = picker.locator("[popover]");
    await picker.evaluate((element, space) => {
      element.coordinateSpace = space;
    }, coordinateSpace);
    await picker.locator(".dp-picker-button").tap();
    const position = coordinateSpace === "viewport" ? "fixed" : "absolute";
    await expect(panel).toHaveCSS("position", position);

    const fitsViewport = () =>
      panel.evaluate((element) => {
        const { left, right, top, bottom } = element.getBoundingClientRect();
        const { width, height } = window.visualViewport;
        return left >= 0 && top >= 0 && right <= width && bottom <= height;
      });

    // Resize before scrolling: the scroll below would otherwise hide an
    // overflow of the popup's padding and border behind the extra 50px.
    await page.setViewportSize({ width: 390, height: 500 });
    await expect(panel).toBeVisible();
    await expect.poll(fitsViewport).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 50));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(50);
    await expect
      .poll(() =>
        picker.evaluate((element) => {
          const input = element.querySelector("#flow-date").getBoundingClientRect();
          const popup = element.querySelector("[popover]").getBoundingClientRect();
          return Math.round(popup.top - input.bottom);
        }),
      )
      .toBe(4);
    await expect.poll(fitsViewport).toBe(true);
  });
}
