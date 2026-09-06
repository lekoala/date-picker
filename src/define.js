import { DateCalendarElement } from "./date-calendar.js";
import { DatePickerElement } from "./date-picker.js";

export function defineDatePicker() {
  if (!customElements.get("date-calendar")) customElements.define("date-calendar", DateCalendarElement);
  if (!customElements.get("date-picker")) customElements.define("date-picker", DatePickerElement);
}

defineDatePicker();
