import { expect, test } from "bun:test";
import {
  addDays,
  addMonths,
  addYears,
  clampDisplayMonth,
  compareDates,
  getMonthWeeks,
  isDate,
  isoWeekNumber,
  monthKey,
  shiftMonth,
  startOfWeek,
} from "../../src/date.js";

test("civil date validation rejects impossible dates", () => {
  expect(isDate("2024-02-29")).toBe(true);
  expect(isDate("2023-02-29")).toBe(false);
  expect(isDate("2026-13-01")).toBe(false);
});

test("canonical months reject year zero and out-of-range months", () => {
  expect(monthKey("0001-01")).toBe("0001-01");
  expect(() => monthKey("0000-01")).toThrow(TypeError);
  expect(() => monthKey("2026-13")).toThrow(TypeError);
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

test("fixed weeks pad ordinary months but never leave the canonical window", () => {
  expect(getMonthWeeks("2021-02", { fixedWeeks: true })).toHaveLength(6);
  const last = getMonthWeeks("9999-12", { firstDay: 6, fixedWeeks: true });
  expect(last).toHaveLength(5);
  expect(last.at(-1).at(-1)).toBe("9999-12-31");
  for (let firstDay = 0; firstDay < 7; firstDay++) {
    for (const month of ["0001-01", "0001-02", "9999-11", "9999-12"]) {
      const weeks = getMonthWeeks(clampDisplayMonth(month, firstDay), { firstDay, fixedWeeks: true });
      expect(weeks.length).toBeLessThanOrEqual(6);
      expect(weeks.every((week) => week.length === 7 && week.every(isDate))).toBe(true);
    }
  }
});

test("week helpers honor firstDay", () => {
  expect(startOfWeek("2026-09-03", 1)).toBe("2026-08-31");
  expect(startOfWeek("2026-09-03", 0)).toBe("2026-08-30");
});

test("firstDay 7 is a pure Sunday alias; 2+ keep their meaning", () => {
  expect(startOfWeek("2026-09-03", 7)).toBe("2026-08-30");
  expect(startOfWeek("2026-09-03", 7)).toBe(startOfWeek("2026-09-03", 0));
  expect(startOfWeek("2026-09-03", 7)).not.toBe("2026-08-31");
  expect(getMonthWeeks("2026-09", { firstDay: 7 })).toEqual(getMonthWeeks("2026-09", { firstDay: 0 }));
  expect(startOfWeek("2026-09-03", 2)).toBe("2026-09-01");
  expect(startOfWeek("2026-09-03", 3)).toBe("2026-09-02");
  expect(startOfWeek("2026-09-03", 1)).toBe("2026-08-31");
});

test("firstDay rejects values outside the Sunday/Monday..Saturday range", () => {
  expect(() => startOfWeek("2026-09-03", 8)).toThrow("firstDay must be 0..6");
  expect(() => getMonthWeeks("2026-09", { firstDay: 8 })).toThrow("firstDay must be 0..6");
});

test("ISO week number matches the mini-calendar fixture", () => {
  expect(isoWeekNumber("2026-08-31")).toBe(36);
});

test("canonical dates compare lexically through the public helper", () => {
  expect(compareDates("2026-09-01", "2026-09-02")).toBe(-1);
  expect(compareDates("2026-09-02", "2026-09-02")).toBe(0);
  expect(compareDates("2027-01-01", "2026-12-31")).toBe(1);
});

test("clampDisplayMonth keeps the grid inside the canonical window", () => {
  // December 9999 overflows into 10000; November 9999 is the last safe month.
  expect(clampDisplayMonth("9999-12", 1)).toBe("9999-11");
  expect(clampDisplayMonth("9999-12", 0)).toBe("9999-11");
  // January 0001 is only safe when the week starts on Monday.
  expect(clampDisplayMonth("0001-01", 1)).toBe("0001-01");
  expect(clampDisplayMonth("0001-01", 0)).toBe("0001-02");
  // In-range months pass through unchanged.
  expect(clampDisplayMonth("2026-09", 1)).toBe("2026-09");
});

test("a clamped display month always yields a buildable grid", () => {
  for (const firstDay of [0, 1, 6]) {
    for (const month of ["0001-01", "0001-02", "9999-11", "9999-12"]) {
      const weeks = getMonthWeeks(clampDisplayMonth(month, firstDay), { firstDay });
      expect(weeks.length).toBeGreaterThan(0);
      expect(weeks.every((week) => week.every((date) => isDate(date)))).toBe(true);
    }
  }
});
