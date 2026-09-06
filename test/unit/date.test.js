import { expect, test } from "bun:test";
import {
  addDays,
  addMonths,
  addYears,
  compareDates,
  getMonthWeeks,
  isDate,
  isoWeekNumber,
  shiftMonth,
  startOfWeek,
} from "../../src/date.js";

test("civil date validation rejects impossible dates", () => {
  expect(isDate("2024-02-29")).toBe(true);
  expect(isDate("2023-02-29")).toBe(false);
  expect(isDate("2026-13-01")).toBe(false);
});

test("date arithmetic clamps month/year transitions", () => {
  expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  expect(addYears("2024-02-29", 1)).toBe("2025-02-28");
  expect(shiftMonth("2026-12", 1)).toBe("2027-01");
});

test("getMonthWeeks returns true weeks and never pads", () => {
  expect(getMonthWeeks("2026-09").length).toBe(5);
  expect(getMonthWeeks("2021-02").length).toBe(4);
  expect(getMonthWeeks("2026-08").every((week) => week.length === 7)).toBe(true);
});

test("week helpers honor firstDay", () => {
  expect(startOfWeek("2026-09-03", 1)).toBe("2026-08-31");
  expect(startOfWeek("2026-09-03", 0)).toBe("2026-08-30");
});

test("ISO week number matches the mini-calendar fixture", () => {
  expect(isoWeekNumber("2026-08-31")).toBe(36);
});

test("canonical dates compare lexically through the public helper", () => {
  expect(compareDates("2026-09-01", "2026-09-02")).toBe(-1);
  expect(compareDates("2026-09-02", "2026-09-02")).toBe(0);
  expect(compareDates("2027-01-01", "2026-12-31")).toBe(1);
});
