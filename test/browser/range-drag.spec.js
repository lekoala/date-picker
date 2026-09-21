import { expect, test } from "@playwright/test";

const DAY = (date) => `#stay-picker .dp-day[data-date="${date}"]`;

/** Open the shared range popup on a committed, ordered pair. */
async function openCommittedRange(page, { endpoint = "start" } = {}) {
  await page.evaluate(() => {
    document.getElementById("stay-picker").range = { start: "2026-09-10", end: "2026-09-15" };
    window.__events = [];
    const picker = document.getElementById("stay-picker");
    picker.addEventListener("rangechange", (event) =>
      window.__events.push(`rangechange:${event.detail.start}:${event.detail.end}`),
    );
  });
  await page.locator(endpoint === "end" ? "#stay-end" : "#stay-start").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await expect(page.locator("#stay-picker date-calendar")).toHaveAttribute("data-range-drag", "ready");
}

/** @returns {Promise<{x:number, y:number}>} */
async function center(page, date) {
  const box = await page.locator(DAY(date)).boundingBox();
  if (!box) throw new Error(`No box for ${date}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragDay(page, from, to, { steps = 8, release = true } = {}) {
  const origin = await center(page, from);
  const target = await center(page, to);
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps });
  if (release) await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/demo/index.html");
});

test("dragging the start handle moves only the start bound", async ({ page }) => {
  await openCommittedRange(page);
  await dragDay(page, "2026-09-10", "2026-09-07");

  await expect(page.locator("#stay-start")).toHaveValue("07/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  await expect(page.locator(DAY("2026-09-07"))).toHaveAttribute("data-range-start", "true");
  await expect(page.locator(DAY("2026-09-09"))).toHaveAttribute("data-in-range", "true");
  // A drag is an adjustment, not a validation: the popup stays open and the
  // change is announced exactly once.
  await expect(page.locator("#stay-picker")).toHaveJSProperty("open", true);
  expect(await page.evaluate(() => window.__events)).toEqual(["rangechange:2026-09-07:2026-09-15"]);
  await expect(page.locator("#stay-picker date-calendar")).not.toHaveAttribute("data-range-preview", /.*/);
  await expect(page.locator("#stay-picker date-calendar")).toHaveAttribute("data-range-drag", "ready");
});

test("dragging the end handle moves only the end bound", async ({ page }) => {
  await openCommittedRange(page);
  await dragDay(page, "2026-09-15", "2026-09-19");

  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("19/09/2026");
  expect(await page.evaluate(() => window.__events)).toEqual(["rangechange:2026-09-10:2026-09-19"]);
});

test("a dragged handle never crosses the other one", async ({ page }) => {
  await openCommittedRange(page);
  // Dragging start well past end clamps to end; the band sticks there during
  // the gesture, so the drop commits exactly what was shown.
  await dragDay(page, "2026-09-10", "2026-09-19");

  await expect(page.locator("#stay-start")).toHaveValue("15/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  expect(await page.evaluate(() => document.getElementById("stay-picker").range)).toEqual({
    start: "2026-09-15",
    end: "2026-09-15",
  });
  // Both handles now sit on the same day, so there is nothing left to grab.
  await expect(page.locator("#stay-picker date-calendar")).not.toHaveAttribute("data-range-drag", /.*/);
});

test("a one-day range offers no handle to drag", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-picker").range = { start: "2026-09-10", end: "2026-09-10" };
  });
  await page.locator("#stay-start").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await expect(page.locator(DAY("2026-09-10"))).toHaveAttribute("data-range-start", "true");
  await expect(page.locator(DAY("2026-09-10"))).toHaveAttribute("data-range-end", "true");
  await expect(page.locator("#stay-picker date-calendar")).not.toHaveAttribute("data-range-drag", /.*/);

  await dragDay(page, "2026-09-10", "2026-09-13");
  // The press is not a drag, so it stays a plain pick through the range machine.
  expect(await page.evaluate(() => document.getElementById("stay-picker").range)).toEqual({
    start: "2026-09-10",
    end: "2026-09-10",
  });
});

test("an unavailable cell is not a drop target", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-picker").isDateDisabled = (date) => date === "2026-09-08";
  });
  await openCommittedRange(page);
  // One jump straight onto the disabled cell: no valid candidate was ever
  // projected, so the drop has nothing to commit.
  await dragDay(page, "2026-09-10", "2026-09-08", { steps: 1 });

  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  expect(await page.evaluate(() => window.__events)).toEqual([]);
  await expect(page.locator(DAY("2026-09-08"))).not.toHaveAttribute("data-range-start", /.*/);
});

test("a press without travel stays a plain click", async ({ page }) => {
  await openCommittedRange(page, { endpoint: "end" });
  const origin = await center(page, "2026-09-10");
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.up();

  // The active bound is `end`, so clicking inside the pair moves `end`; the
  // armed-but-never-started drag must not swallow that click.
  await expect(page.locator("#stay-end")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
});

test("a real drag produces no second activation from the trailing click", async ({ page }) => {
  await openCommittedRange(page);
  await page.evaluate(() => {
    window.__activations = [];
    document
      .getElementById("stay-picker")
      .addEventListener("dateactivate", (event) => window.__activations.push(event.detail.date));
  });
  await dragDay(page, "2026-09-10", "2026-09-07");

  await expect(page.locator("#stay-start")).toHaveValue("07/09/2026");
  expect(await page.evaluate(() => window.__activations)).toEqual(["2026-09-07"]);
  expect(await page.evaluate(() => window.__events)).toEqual(["rangechange:2026-09-07:2026-09-15"]);
});

test("cancelling dateactivate also refuses a drop", async ({ page }) => {
  await openCommittedRange(page);
  await page.evaluate(() => {
    document.getElementById("stay-picker").addEventListener("dateactivate", (event) => {
      if (event.detail.date === "2026-09-07") event.preventDefault();
    });
  });
  await dragDay(page, "2026-09-10", "2026-09-07");

  // The drop goes through the same cancelable seam as a click, so an
  // application veto cannot be bypassed by a different input device.
  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  await expect(page.locator("#stay-end")).toHaveValue("15/09/2026");
  expect(await page.evaluate(() => window.__events)).toEqual([]);
});

test("pointercancel restores the committed range", async ({ page }) => {
  await openCommittedRange(page);
  await page.evaluate(() => {
    window.__pointerId = null;
    document.querySelector("#stay-picker date-calendar").addEventListener(
      "pointerdown",
      (event) => {
        window.__pointerId = event.pointerId;
      },
      { capture: true },
    );
  });
  await dragDay(page, "2026-09-10", "2026-09-07", { release: false });
  await expect(page.locator(DAY("2026-09-07"))).toHaveAttribute("data-range-start", "true");

  await page.evaluate(() => {
    document
      .querySelector("#stay-picker date-calendar")
      .dispatchEvent(new PointerEvent("pointercancel", { pointerId: window.__pointerId, bubbles: true }));
  });
  await expect(page.locator(DAY("2026-09-10"))).toHaveAttribute("data-range-start", "true");
  await expect(page.locator(DAY("2026-09-07"))).not.toHaveAttribute("data-range-start", /.*/);
  await page.mouse.up();

  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  expect(await page.evaluate(() => window.__events)).toEqual([]);
});

test("a read-only bound exposes no drag handle", async ({ page }) => {
  await page.evaluate(() => {
    document.getElementById("stay-picker").range = { start: "2026-09-10", end: "2026-09-15" };
    document.getElementById("stay-start").readOnly = true;
    window.__events = [];
    document
      .getElementById("stay-picker")
      .addEventListener("rangechange", () => window.__events.push("rangechange"));
  });
  await page.locator("#stay-end").focus();
  await expect(page.locator("#stay-picker .dp-picker-panel")).toBeVisible();
  await dragDay(page, "2026-09-10", "2026-09-07");

  await expect(page.locator("#stay-start")).toHaveValue("10/09/2026");
  expect(await page.evaluate(() => window.__events)).toEqual([]);
});
