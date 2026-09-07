import { expect, test } from "bun:test";
import { normalizeRange, rangePosition } from "../../src/date-range.js";

test("normalizeRange resets on null and empty values", () => {
  expect(normalizeRange(null)).toEqual({ start: "", end: "" });
  expect(normalizeRange(undefined)).toEqual({ start: "", end: "" });
  expect(normalizeRange({ start: "", end: "" })).toEqual({ start: "", end: "" });
});

test("normalizeRange keeps a valid ordered range unchanged", () => {
  expect(normalizeRange({ start: "2026-09-10", end: "2026-09-15" })).toEqual({
    start: "2026-09-10",
    end: "2026-09-15",
  });
  expect(normalizeRange({ start: "2026-09-10" })).toEqual({ start: "2026-09-10", end: "" });
});

test("normalizeRange rejects an inversion without reordering", () => {
  expect(() => normalizeRange({ start: "2026-09-20", end: "2026-09-15" })).toThrow("must be ordered");
});

test("normalizeRange rejects an end without a start", () => {
  expect(() => normalizeRange({ start: "", end: "2026-09-15" })).toThrow("without a start");
});

test("normalizeRange rejects malformed dates and shapes", () => {
  expect(() => normalizeRange({ start: "not-a-date", end: "" })).toThrow();
  expect(() => normalizeRange("2026-09-10")).toThrow();
  expect(() => normalizeRange(42)).toThrow();
});

test("rangePosition ignores an empty or absent range", () => {
  expect(rangePosition("2026-09-10", null)).toBe("");
  expect(rangePosition("2026-09-10", { start: "", end: "" })).toBe("");
  expect(rangePosition("2026-09-10", undefined)).toBe("");
});

test("rangePosition marks a start-only range as start", () => {
  const range = normalizeRange({ start: "2026-09-10" });
  expect(rangePosition("2026-09-10", range)).toBe("start");
  expect(rangePosition("2026-09-11", range)).toBe("");
});

test("rangePosition reports start, in and end inside a full range", () => {
  const range = normalizeRange({ start: "2026-09-10", end: "2026-09-15" });
  expect(rangePosition("2026-09-10", range)).toBe("start");
  expect(rangePosition("2026-09-11", range)).toBe("in");
  expect(rangePosition("2026-09-15", range)).toBe("end");
  expect(rangePosition("2026-09-09", range)).toBe("");
  expect(rangePosition("2026-09-16", range)).toBe("");
});

test("rangePosition reports a single-day range as single", () => {
  const range = normalizeRange({ start: "2026-09-10", end: "2026-09-10" });
  expect(rangePosition("2026-09-10", range)).toBe("single");
  expect(rangePosition("2026-09-11", range)).toBe("");
});
