import { expect, test } from "@playwright/test";

/**
 * Transition harness: an operation suspends on a controlled source promise,
 * a newer state change lands, then the old operation settles. Every case
 * checks the same four outputs: canonical value, visible text, hidden ISO and
 * emitted events (plus validity when the case is about constraints).
 */

const snapshotSingle = (page) =>
  page.evaluate(() => {
    const picker = document.getElementById("life-single");
    const input = document.getElementById("life-single-input");
    return {
      value: picker.value,
      text: input.value,
      hidden: picker.querySelector('input[type="hidden"][name="single"]')?.value ?? null,
      valid: input.checkValidity(),
      events: window.__events.slice(),
    };
  });

const snapshotRange = (page) =>
  page.evaluate(() => {
    const picker = document.getElementById("life-range");
    const start = document.getElementById("life-start");
    const end = document.getElementById("life-end");
    return {
      range: picker.range,
      texts: [start.value, end.value],
      hidden: [
        picker.querySelector('input[type="hidden"][name="start"]')?.value ?? null,
        picker.querySelector('input[type="hidden"][name="end"]')?.value ?? null,
      ],
      valid: [start.checkValidity(), end.checkValidity()],
      events: window.__events.slice(),
    };
  });

const settle = (page) => page.evaluate(() => window.__settle(10));

test.beforeEach(async ({ page }) => {
  await page.goto("/test/fixtures/lifecycle.html");
});

test("#1 a newer typed date supersedes a pending commit", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-single");
    picker.value = "";
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    const input = document.getElementById("life-single-input");
    input.value = "2026-09-06";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    // Setting the source clears the month cache, starts a gated load and
    // revalidates: the commit of 2026-09-06 is now suspended on it.
    picker.source = window.__source;
    input.value = "2026-09-07";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(page);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("life-single").value))
    .toBe("2026-09-07");
  const state = await snapshotSingle(page);
  expect(state).toMatchObject({ text: "2026-09-07", hidden: "2026-09-07", valid: true });
  expect(state.events).toEqual([["valuechange", "2026-09-07"]]);
});

test("#2 a programmatic value supersedes a pending commit", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-single");
    picker.value = "";
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    const input = document.getElementById("life-single-input");
    input.value = "2026-09-06";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picker.source = window.__source;
    picker.value = "2026-09-20";
  });
  await settle(page);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("life-single").value))
    .toBe("2026-09-20");
  const state = await snapshotSingle(page);
  expect(state).toMatchObject({ text: "2026-09-20", hidden: "2026-09-20", valid: true });
  expect(state.events).toEqual([["valuechange", "2026-09-20"]]);
});

test("#3 closing the popup drops a pending grid activation", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-single");
    picker.value = "2026-09-06";
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    picker.source = window.__source;
    picker.show({ moveFocus: false });
    document.querySelector('#life-single .dp-day[data-date="2026-09-12"]').click();
    picker.hide();
  });
  await settle(page);
  const state = await snapshotSingle(page);
  expect(state).toMatchObject({ value: "2026-09-06", text: "2026-09-06", hidden: "2026-09-06" });
  expect(state.events).toEqual([]);
});

test("#4 switching the active range bound drops the pending activation", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-range");
    picker.range = { start: "2026-09-10", end: "" };
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    picker.source = window.__source;
    picker.show({ endpoint: "start", moveFocus: false });
    document.querySelector('#life-range .dp-day[data-date="2026-09-12"]').click();
    document.getElementById("life-end").focus();
  });
  await settle(page);
  const state = await snapshotRange(page);
  expect(state.range).toEqual({ start: "2026-09-10", end: "" });
  expect(state.texts).toEqual(["2026-09-10", ""]);
  expect(state.events).toEqual([]);
});

test("#5 a constraint change wins over a pending commit", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-single");
    picker.value = "";
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    const input = document.getElementById("life-single-input");
    input.value = "2026-09-06";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picker.source = window.__source;
    picker.min = "2026-09-10";
  });
  await settle(page);
  const state = await snapshotSingle(page);
  expect(state).toMatchObject({ value: "", text: "2026-09-06", hidden: "", valid: false });
  expect(state.events).toEqual([]);
});

test("#6 a form reset wins over a pending commit", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-single");
    picker.value = "";
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    const input = document.getElementById("life-single-input");
    input.value = "2026-09-06";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picker.source = window.__source;
    document.getElementById("life-reset").click();
  });
  await settle(page);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("life-single").value))
    .toBe("2026-09-01");
  const state = await snapshotSingle(page);
  expect(state).toMatchObject({ text: "2026-09-01", hidden: "2026-09-01" });
  expect(state.events).toEqual([["valuechange", "2026-09-01"]]);
});

test("#7 a reconnected picker never resumes the old session", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-single");
    picker.value = "";
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    const input = document.getElementById("life-single-input");
    input.value = "2026-09-06";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    picker.source = window.__source;
    // Reconnect rebuilds controllers and aborts the pending session.
    const parent = picker.parentNode;
    const next = picker.nextSibling;
    picker.remove();
    parent.insertBefore(picker, next);
    // The rebuilt instance reads the live text as its initial value; from here
    // on, only the programmatic value may be announced.
    window.__events.length = 0;
    picker.value = "2026-09-20";
  });
  await settle(page);
  await expect
    .poll(() => page.evaluate(() => document.getElementById("life-single").value))
    .toBe("2026-09-20");
  const state = await snapshotSingle(page);
  expect(state).toMatchObject({ text: "2026-09-20", hidden: "2026-09-20" });
  expect(state.events).toEqual([["valuechange", "2026-09-20"]]);
});

test("#8 closing the popup drops a pending range activation", async ({ page }) => {
  await page.evaluate(() => {
    const picker = document.getElementById("life-range");
    picker.range = { start: "2026-09-10", end: "" };
    picker.calendar.display = "2026-09";
    window.__events.length = 0;
    picker.source = window.__source;
    picker.show({ endpoint: "start", moveFocus: false });
    document.querySelector('#life-range .dp-day[data-date="2026-09-12"]').click();
    picker.hide();
  });
  await settle(page);
  const state = await snapshotRange(page);
  expect(state.range).toEqual({ start: "2026-09-10", end: "" });
  expect(state.events).toEqual([]);
});

test("#9 a stale load cleanup cannot clear a newer same-month load", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const calendar = document.getElementById("life-cal");
    window.__calls = 0;
    window.__pending.length = 0;
    const source = (range, context) => window.__source(range, context);
    calendar.source = source; // call 1, pending
    // Reconnect: render() starts call 2 for the same month.
    const parent = calendar.parentNode;
    const next = calendar.nextSibling;
    calendar.remove();
    parent.insertBefore(calendar, next);
    // Let the aborted call's finally run.
    await Promise.resolve();
    await Promise.resolve();
    const pending = calendar.ensureDate("2026-09-10");
    const callsBeforeSettle = window.__calls;
    window.__settle(10);
    return { callsBeforeSettle, ok: await pending };
  });
  // The in-flight load must be reused, not aborted and restarted.
  expect(state).toEqual({ callsBeforeSettle: 2, ok: true });
});

test("#10 a stale range validate writes no validity after reconnect", async ({ page }) => {
  const state = await page.evaluate(async () => {
    const picker = document.getElementById("life-range");
    const start = document.getElementById("life-start");
    const end = document.getElementById("life-end");
    window.__pending.length = 0;
    picker.range = { start: "2026-09-10", end: "2026-09-15" };
    picker.calendar.display = "2026-09";
    picker.source = window.__source;
    start.value = "2026-09-20";
    start.dispatchEvent(new Event("input", { bubbles: true }));
    const pending = picker.validate(); // suspends on the pending source
    const parent = picker.parentNode;
    const next = picker.nextSibling;
    picker.remove();
    parent.insertBefore(picker, next);
    // Count only writes made after the rebuild.
    const writes = [];
    for (const [name, input] of [
      ["start", start],
      ["end", end],
    ]) {
      const original = input.setCustomValidity.bind(input);
      input.setCustomValidity = (message) => {
        writes.push([name, message]);
        original(message);
      };
    }
    const result = await pending;
    return { writes, result };
  });
  expect(state.writes).toEqual([]);
  expect(state.result).toBe(false);
});
