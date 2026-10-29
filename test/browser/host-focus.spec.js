import { expect, test } from "@playwright/test";

// WebKit on macOS follows the system "Keyboard navigation" setting: plain Tab
// skips buttons and selects, Alt+Tab walks every focusable control.
const tabKey = (browserName) => (browserName === "webkit" ? "Alt+Tab" : "Tab");

// The host fixture draws deliberately unlike --dp-* (4px, +1px, green/red) so
// any component declaration on the field is immediately visible here.
const expectHostRing = async (locator, color) => {
  await expect(locator).toHaveCSS("outline-style", "solid");
  await expect(locator).toHaveCSS("outline-width", "4px");
  await expect(locator).toHaveCSS("outline-offset", "1px");
  await expect(locator).toHaveCSS("outline-color", color);
};

const expectComponentRing = async (locator, offset) => {
  await expect(locator).toHaveCSS("outline-style", "solid");
  await expect(locator).toHaveCSS("outline-width", "2px");
  await expect(locator).toHaveCSS("outline-offset", offset);
  await expect(locator).toHaveCSS("outline-color", "rgb(37, 99, 235)");
};

const fixtures = [
  { path: "/test/fixtures/host-focus.html", label: "unlayered host styles" },
  { path: "/test/fixtures/host-focus-layered.html", label: "layered host styles" },
];

for (const fixture of fixtures) {
  test.describe(fixture.label, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(fixture.path);
    });

    test("the host keeps its focus ring on a valid field", async ({ page }) => {
      await page.locator("#host-date").focus();
      await expect(page.locator("#host-date")).toBeFocused();
      await expectHostRing(page.locator("#host-date"), "rgb(0, 128, 0)");
    });

    test("the host keeps its validation color when an invalid field is focused", async ({ page }) => {
      await page.locator("#host-date").fill("31/02/2026");
      await page.locator("#host-date").blur();
      await expect(page.locator("#host-date")).toHaveAttribute("aria-invalid", "true");

      await page.locator("#host-date").focus();
      await expect(page.locator("#host-date")).toBeFocused();
      await expectHostRing(page.locator("#host-date"), "rgb(200, 0, 0)");
    });

    test("component-owned controls keep the --dp-focus tokens", async ({ page }) => {
      const trigger = page.locator("#host-picker .dp-picker-button");
      await trigger.focus();
      await expectComponentRing(trigger, "-5px");

      const day = page.locator('#host-cal .dp-day[tabindex="0"]');
      await day.focus();
      await expectComponentRing(day, "-2px");

      const month = page.locator("#host-cal .dp-month-select");
      await month.focus();
      await expectComponentRing(month, "-2px");

      const year = page.locator("#host-cal .dp-year-input");
      await year.focus();
      await expectComponentRing(year, "-2px");
    });

    test("a bare field keeps a visible keyboard focus indicator", async ({ page, browserName }) => {
      await page.locator("#before-bare").focus();
      await page.keyboard.press(tabKey(browserName));
      await expect(page.locator("#bare-date")).toBeFocused();

      const indicator = await page.locator("#bare-date").evaluate((element) => {
        const style = getComputedStyle(element);
        return { line: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
      });
      // Engine-owned indicator: assert visibility, never a color or an offset.
      expect(indicator.line).not.toBe("none");
      expect(indicator.width).toBeGreaterThan(0);
    });
  });
}
