import { expect, test } from "bun:test";
import { DateRangeController, normalizeRange, rangePosition } from "../../src/date-range.js";

test("complete ranges extend the corresponding editable bound", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.end = "2026-09-15";
  model.focus("end");
  expect(model.activate("2026-09-05", (bound) => bound !== "start").status).toBe("refused");
  expect(model.start).toBe("2026-09-10");
  expect(model.activate("2026-09-05").endpoint).toBe("start");
  expect(model.activate("2026-09-20", (bound) => bound !== "end").status).toBe("refused");
  expect(model.end).toBe("2026-09-15");
  expect(model.activate("2026-09-20").endpoint).toBe("end");
  expect(model.range).toEqual({ start: "2026-09-05", end: "2026-09-20" });
});

test("a second pick after the anchor extends the range forward", () => {
  const model = new DateRangeController();
  model.focus("start");
  expect(model.activate("2026-09-10").status).toBe("pending");
  expect(model.activeEndpoint).toBe("end");
  const result = model.activate("2026-09-15");
  expect(result.status).toBe("complete");
  expect(result.changedEndpoints).toEqual(["end"]);
  expect(model.range).toEqual({ start: "2026-09-10", end: "2026-09-15" });
});

test("a second pick before the anchor is sorted instead of refused", () => {
  const model = new DateRangeController();
  model.focus("start");
  model.activate("2026-09-10");
  const result = model.activate("2026-09-05");
  expect(result.status).toBe("complete");
  // Both bounds move at once, so the transition has to describe the pair.
  expect(result.changedEndpoints).toEqual(["start", "end"]);
  expect(result.range).toEqual({ start: "2026-09-05", end: "2026-09-10" });
  expect(model.range).toEqual({ start: "2026-09-05", end: "2026-09-10" });
});

test("picking the anchor twice makes a one-day range", () => {
  const model = new DateRangeController();
  model.focus("start");
  model.activate("2026-09-10");
  expect(model.activate("2026-09-10").status).toBe("complete");
  expect(model.range).toEqual({ start: "2026-09-10", end: "2026-09-10" });
});

test("a range anchored by its end is sorted from the other side too", () => {
  const model = new DateRangeController();
  model.end = "2026-09-15";
  model.focus("start");
  const result = model.activate("2026-09-20");
  expect(result.changedEndpoints).toEqual(["start", "end"]);
  expect(model.range).toEqual({ start: "2026-09-15", end: "2026-09-20" });
});

test("an existing pair keeps each bound's identity", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.end = "2026-09-15";
  model.focus("end");
  // Inside the pair `end` moves; it is never allowed to pass `start` by
  // silently rewriting the other field.
  expect(model.activate("2026-09-12").range).toEqual({ start: "2026-09-10", end: "2026-09-12" });
  expect(model.activate("2026-09-05").status).toBe("complete");
  expect(model.range).toEqual({ start: "2026-09-05", end: "2026-09-12" });
});

test("the sorted second pick needs both bounds editable", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.focus("end");
  expect(model.activate("2026-09-05", (bound) => bound !== "start").status).toBe("refused");
  expect(model.range).toEqual({ start: "2026-09-10", end: "" });
});

test("project describes a transition without applying it", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.focus("end");
  const projected = model.project("2026-09-05");
  expect(projected.range).toEqual({ start: "2026-09-05", end: "2026-09-10" });
  expect(model.range).toEqual({ start: "2026-09-10", end: "" });
});

test("previewRange projects the same rules as a pick", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.focus("end");
  expect(model.previewRange("2026-09-15")).toEqual({ start: "2026-09-10", end: "2026-09-15" });
  expect(model.previewRange("2026-09-05")).toEqual({ start: "2026-09-05", end: "2026-09-10" });
  expect(model.previewRange("2026-09-10")).toEqual({ start: "2026-09-10", end: "2026-09-10" });
  expect(model.previewRange("nope")).toBeNull();
  expect(model.range).toEqual({ start: "2026-09-10", end: "" });
});

test("previewRange stays silent without a selection in progress", () => {
  const empty = new DateRangeController();
  empty.focus("start");
  expect(empty.previewRange("2026-09-10")).toBeNull();
  const complete = new DateRangeController();
  complete.start = "2026-09-10";
  complete.end = "2026-09-15";
  complete.focus("end");
  expect(complete.previewRange("2026-09-20")).toBeNull();
});

test("an endpoint drag moves one bound and never crosses the other", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.end = "2026-09-15";
  expect(model.previewRange("2026-09-05", "start")).toEqual({ start: "2026-09-05", end: "2026-09-15" });
  expect(model.previewRange("2026-09-20", "end")).toEqual({ start: "2026-09-10", end: "2026-09-20" });
  // Clamped to the opposite bound, so a drop commits exactly what was shown.
  expect(model.previewRange("2026-09-30", "start")).toEqual({ start: "2026-09-15", end: "2026-09-15" });
  expect(model.previewRange("2026-09-01", "end")).toEqual({ start: "2026-09-10", end: "2026-09-10" });
  expect(model.range).toEqual({ start: "2026-09-10", end: "2026-09-15" });
});

test("an endpoint drag refuses an incomplete range and an uneditable bound", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  expect(model.projectEndpoint("2026-09-05", "start").status).toBe("refused");
  expect(model.previewRange("2026-09-05", "start")).toBeNull();
  model.end = "2026-09-15";
  expect(model.projectEndpoint("2026-09-05", "start", (bound) => bound !== "start").status).toBe("refused");
  expect(model.moveEndpoint("2026-09-05", "start").range).toEqual({
    start: "2026-09-05",
    end: "2026-09-15",
  });
  expect(model.range).toEqual({ start: "2026-09-05", end: "2026-09-15" });
});

test("an endpoint drag back to its origin reports no change", () => {
  const model = new DateRangeController();
  model.start = "2026-09-10";
  model.end = "2026-09-15";
  expect(model.projectEndpoint("2026-09-10", "start").changedEndpoints).toEqual([]);
});

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
