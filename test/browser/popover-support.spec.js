import { expect, test } from "@playwright/test";

test("without Popover, authored fields keep native form behavior and the inline calendar works", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    delete HTMLElement.prototype.showPopover;
  });
  await page.goto("/test/fixtures/position.html");
  await page.evaluate(() => {
    const form = document.createElement("form");
    form.id = "fallback";
    form.innerHTML = `
      <date-picker>
        <input name="date" value="2026-09-10" required>
      </date-picker>
      <date-picker range>
        <input data-range-start name="arrival" value="2026-09-11" required>
        <input data-range-end name="departure" value="2026-09-15">
      </date-picker>
      <date-calendar display="2026-09"></date-calendar>
    `;
    document.body.prepend(form);
  });

  const form = page.locator("#fallback");
  const input = form.locator('input[name="date"]');
  const single = form.locator("date-picker:not([range])");
  const range = form.locator("date-picker[range]");
  await expect(form.locator("date-picker button, date-picker [popover], input[type=hidden]")).toHaveCount(0);
  await expect(input).toHaveValue("2026-09-10");
  await input.fill("");
  await expect(form.locator("input:invalid")).toHaveCount(1);
  expect(await single.evaluate((picker) => picker.validate())).toBe(false);
  await input.fill("2026-09-12");
  await expect(form.locator("input:invalid")).toHaveCount(0);
  expect(await single.evaluate((picker) => picker.validate())).toBe(true);
  const arrival = range.locator('input[name="arrival"]');
  await arrival.fill("");
  expect(await range.evaluate((picker) => picker.validate())).toBe(false);
  await arrival.fill("2026-09-11");
  expect(await range.evaluate((picker) => picker.validate())).toBe(true);
  expect(await form.evaluate((element) => Array.from(new FormData(element)))).toEqual([
    ["date", "2026-09-12"],
    ["arrival", "2026-09-11"],
    ["departure", "2026-09-15"],
  ]);
  await form.evaluate((element) => element.reset());
  await expect(input).toHaveValue("2026-09-10");

  await form.locator('date-calendar [data-date="2026-09-13"]').click();
  await expect(form.locator("date-calendar")).toHaveAttribute("value", "2026-09-13");
  expect(errors).toEqual([]);
});
