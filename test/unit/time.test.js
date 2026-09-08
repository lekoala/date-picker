import { expect, test } from "bun:test";
import { compareTimes, isTime } from "../../src/time.js";

test("time validation accepts canonical HTML time values", () => {
  expect(isTime("00:00")).toBe(true);
  expect(isTime("23:59")).toBe(true);
  expect(isTime("09:30:15")).toBe(true);
  expect(isTime("09:30:15.500")).toBe(true);
});

test("time validation rejects out-of-range and malformed values", () => {
  expect(isTime("")).toBe(false);
  expect(isTime("9:30")).toBe(false);
  expect(isTime("24:00")).toBe(false);
  expect(isTime("09:60")).toBe(false);
  expect(isTime("09:30:60")).toBe(false);
  expect(isTime("09:30 ")).toBe(false);
  expect(isTime("2026-09-10")).toBe(false);
});

test("short and long forms of the same time are equal", () => {
  expect(compareTimes("09:30", "09:30:00")).toBe(0);
  expect(compareTimes("09:30:00.000", "09:30")).toBe(0);
});

test("times compare chronologically", () => {
  expect(compareTimes("09:00", "10:00")).toBe(-1);
  expect(compareTimes("10:00", "09:00")).toBe(1);
  expect(compareTimes("09:30:15", "09:30:16")).toBe(-1);
  expect(compareTimes("09:30:15.100", "09:30:15.500")).toBe(-1);
});

test("comparison rejects invalid values", () => {
  expect(() => compareTimes("09:00", "")).toThrow("compareTimes() expects HH:MM values");
  expect(() => compareTimes("nope", "09:00")).toThrow("compareTimes() expects HH:MM values");
});
