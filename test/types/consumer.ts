import {
  CalendarModel,
  createDateAdapter,
  createFetchSource,
  DateCalendarElement,
  DatePickerElement,
  dates,
  getDefaultControlClasses,
  linkDateRange,
  setDefaultControlClasses,
} from "@lekoala/date-picker";

const calendar = new DateCalendarElement();
setDefaultControlClasses({ month: "[&>svg]:size-4", nav: "btn" });
const defaultMonth: string = getDefaultControlClasses().month;
calendar.controlClasses = { year: "input" };
const calendarNav: string = calendar.controlClasses.nav;
calendar.controlClasses = null;
void defaultMonth;
void calendarNav;
// @ts-expect-error control roles are limited to month, year and nav
setDefaultControlClasses({ day: "button" });
// @ts-expect-error class values must be strings
calendar.controlClasses = { month: 42 };
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
start.controlClasses = { nav: "btn", month: "data-[state=open]:bg-muted" };
const pickerYear: string = start.controlClasses.year;
start.controlClasses = null;
void pickerYear;
// @ts-expect-error the picker accepts the same named control roles
start.controlClasses = { trigger: "btn" };
const end = new DatePickerElement();
start.value = "2026-09-10";
end.value = "2026-09-15";
const cleanup = linkDateRange(start, end);
cleanup();

const rangePicker = document.createElement("date-picker") as DatePickerElement;
const range = rangePicker.range;
if (range) {
  const ordered: boolean = range.start <= range.end;
  void ordered;
}
rangePicker.range = { start: "2026-09-10", end: "2026-09-15" };
const valueIsUndefined: string | undefined = rangePicker.value;
void valueIsUndefined;

const model = new CalendarModel({ value: "2026-09-10" });
model.navigateMonth(1);

const adapter = createDateAdapter("fr-BE");
void adapter.parse(adapter.format("2026-09-10"));
void dates.getMonthWeeks("2026-09", { firstDay: 1 });
