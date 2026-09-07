import { expect, test } from "bun:test";
import { CalendarModel } from "../../src/calendar-model.js";

test("display navigation never changes value", () => {
  const model = new CalendarModel({ value: "2026-09-10", display: "2026-09" });
  model.navigateMonth(1);
  expect(model.display).toBe("2026-10");
  expect(model.value).toBe("2026-09-10");
});

test("keyboard focus follows month boundaries without selecting", () => {
  const model = new CalendarModel({ value: "2026-09-30", focused: "2026-09-30" });
  model.moveFocusDays(1);
  expect(model.focused).toBe("2026-10-01");
  expect(model.display).toBe("2026-10");
  expect(model.value).toBe("2026-09-30");
});

test("month focus clamps the day while preserving selection", () => {
  const model = new CalendarModel({ value: "2026-01-31", focused: "2026-01-31" });
  model.moveFocusMonths(1);
  expect(model.focused).toBe("2026-02-28");
  expect(model.value).toBe("2026-01-31");
});

test("firstDay 7 normalizes to Sunday in the model", () => {
  expect(new CalendarModel({ firstDay: 7 }).firstDay).toBe(0);
  expect(new CalendarModel({ firstDay: 2 }).firstDay).toBe(2);
});
