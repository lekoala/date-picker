import { expect, test } from "@playwright/test";

export function placementTests(path) {
  test.beforeEach(async ({ page }) => {
    await page.goto(path);
    await page.evaluate(async () => {
      await customElements.whenDefined("date-picker");
      const picker = document.createElement("date-picker");
      picker.id = "placement-picker";
      picker.setAttribute("open-on-focus", "false");
      picker.style.cssText = "position:fixed;left:320px;top:40px;width:560px";
      picker.innerHTML = '<input name="placement-date">';
      document.body.append(picker);
    });
  });

  for (const direction of ["ltr", "rtl"]) {
    test(`default popup aligns with the trigger end in ${direction}`, async ({ page }) => {
      await page.locator("#placement-picker").evaluate((picker, dir) => {
        picker.dir = dir;
      }, direction);
      await page.locator("#placement-picker .dp-picker-button").click();
      const boxes = await page.locator("#placement-picker").evaluate((picker) => {
        const host = picker.getBoundingClientRect();
        const panel = picker.querySelector(".dp-picker-panel").getBoundingClientRect();
        return { left: panel.left - host.left, right: panel.right - host.right };
      });
      expect(direction === "ltr" ? boxes.right : boxes.left).toBeCloseTo(0, 0);
    });

    test(`composed input anchors to the date field in ${direction}`, async ({ page }) => {
      await page.locator("#placement-picker").evaluate((picker, dir) => {
        picker.remove();
        picker.dir = dir;
        picker.style.cssText = "position:fixed;left:320px;top:40px;width:840px";
        picker.innerHTML =
          '<input name="placement-date"><input type="time" data-time-start><input type="time" data-time-end>';
        document.body.append(picker);
      }, direction);
      await page.locator("#placement-picker .dp-picker-button").click();
      const offsets = await page.locator("#placement-picker").evaluate((picker) => {
        const field = picker
          .querySelector('input:not([type="hidden"]):not([type="time"])')
          .getBoundingClientRect();
        const panel = picker.querySelector(".dp-picker-panel").getBoundingClientRect();
        return {
          left: panel.left - field.left,
          right: panel.right - field.right,
          gap: panel.top - field.bottom,
        };
      });
      expect(direction === "ltr" ? offsets.right : offsets.left).toBeCloseTo(0, 0);
      expect(offsets.gap).toBeCloseTo(4, 0);
    });
  }

  test("placement reflects, falls back, and is captured per opening", async ({ page }) => {
    const result = await page.locator("#placement-picker").evaluate(async (picker) => {
      const panel = picker.querySelector(".dp-picker-panel");
      const defaults = [picker.placement];
      for (const value of ["", "nonsense"]) {
        picker.setAttribute("placement", value);
        defaults.push(picker.placement);
      }
      picker.placement = "bottom-start";
      const reflected = picker.getAttribute("placement");
      picker.show({ moveFocus: false });
      const first = panel.dataset.placement;
      picker.setAttribute("placement", "bottom-end");
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const current = panel.dataset.placement;
      picker.hide();
      picker.show({ moveFocus: false });
      return { defaults, reflected, first, current, next: panel.dataset.placement };
    });
    expect(result).toEqual({
      defaults: ["bottom-end", "bottom-end", "bottom-end"],
      reflected: "bottom-start",
      first: "bottom-start",
      current: "bottom-start",
      next: "bottom-end",
    });
  });

  test("end placement keeps a narrow field popup within the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.locator("#placement-picker").evaluate((picker) => {
      picker.style.left = "12px";
      picker.style.width = "160px";
      picker.show();
    });
    const box = await page.locator("#placement-picker .dp-picker-panel").boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(7);
    expect(box.x + box.width).toBeLessThanOrEqual(383);
  });

  test("range mode uses the configured placement on its shared popup", async ({ page }) => {
    const result = await page.locator("#placement-picker").evaluate((picker) => {
      picker.remove();
      picker.setAttribute("range", "");
      picker.setAttribute("placement", "bottom-start");
      picker.innerHTML = "<input data-range-start><input data-range-end>";
      document.body.append(picker);
      picker.show({ endpoint: "end", moveFocus: false });
      return picker.querySelector(".dp-picker-panel").dataset.placement;
    });
    expect(result).toBe("bottom-start");
  });
}
