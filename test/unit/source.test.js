import { expect, test } from "bun:test";
import { createFetchSource, normalizeDateStates } from "../../src/source.js";

test("normalizeDateStates accepts the { dates } wrapper", () => {
  const map = normalizeDateStates({ dates: { "2026-09-12": { disabled: true } } });
  expect(map.get("2026-09-12")).toEqual({ disabled: true });
});

test("normalizeDateStates accepts a bare date map", () => {
  const map = normalizeDateStates({ "2026-09-12": { description: "Full" } });
  expect(map.get("2026-09-12")).toEqual({ description: "Full" });
});

test("normalizeDateStates accepts an array payload and skips items without date", () => {
  const map = normalizeDateStates([{ date: "2026-09-12", disabled: true }, { disabled: true }]);
  expect(map.get("2026-09-12")).toEqual({ disabled: true });
  expect(map.size).toBe(1);
});

test("normalizeDateStates defaults non-object states to empty", () => {
  const map = normalizeDateStates({ "2026-09-12": "busy" });
  expect(map.get("2026-09-12")).toEqual({});
});

test("createFetchSource appends range params and applies map", async () => {
  const seen = {};
  const originalFetch = globalThis.fetch;
  // @ts-expect-error test stub
  globalThis.fetch = async (url, init) => {
    seen.url = String(url);
    seen.signal = init?.signal;
    return { ok: true, json: async () => ({ dates: { "2026-09-12": {} } }) };
  };
  try {
    const source = createFetchSource("https://example.test/availability", {
      map: (payload) => payload,
    });
    const controller = new AbortController();
    const payload = await source.load(
      { start: "2026-09-01", end: "2026-09-30" },
      { signal: controller.signal },
    );
    expect(seen.url).toContain("start=2026-09-01");
    expect(seen.url).toContain("end=2026-09-30");
    expect(seen.signal).toBe(controller.signal);
    expect(payload).toEqual({ dates: { "2026-09-12": {} } });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createFetchSource rejects on HTTP errors", async () => {
  const originalFetch = globalThis.fetch;
  // @ts-expect-error test stub
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  try {
    const source = createFetchSource("https://example.test/availability");
    await expect(source.load({ start: "2026-09-01", end: "2026-09-30" })).rejects.toThrow("500");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
