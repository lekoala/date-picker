import {
  CalendarModel,
  createDateAdapter,
  createFetchSource,
  DateCalendarElement,
  DatePickerElement,
  dates,
  linkDateRange,
} from "@lekoala/date-picker";

const calendar = new DateCalendarElement();
calendar.value = "2026-09-10";
calendar.display = "2026-10";
calendar.selection = "none";
calendar.isDateDisabled = (date) => date.endsWith("-01");
calendar.dateState = (date) => ({ description: date });
calendar.renderDay = (_date, state) => String(state.description ?? "");
calendar.source = createFetchSource("/availability");
calendar.nextMonth();
calendar.focusDate("2026-10-10", { moveFocus: false });
void calendar.getDateState("2026-10-10");

const start = new DatePickerElement();
const end = new DatePickerElement();
start.value = "2026-09-10";
end.value = "2026-09-15";
const cleanup = linkDateRange(start, end);
cleanup();

const model = new CalendarModel({ value: "2026-09-10" });
model.navigateMonth(1);

const adapter = createDateAdapter("fr-BE");
void adapter.parse(adapter.format("2026-09-10"));
void dates.getMonthWeeks("2026-09", { firstDay: 1 });
