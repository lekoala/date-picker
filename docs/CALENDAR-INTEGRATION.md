# Integration with @lekoala/calendar

The mini calendar is intentionally a consumer of the date-picker package, not a feature duplicated inside the scheduling engine.

The live integration lives in `demo/index.html` (card 6): a real `<calendar-view view="month">` is wired to the mini calendar. `@lekoala/calendar` (and its `temporal-polyfill` peer) are dev dependencies used by the demo only.

`@lekoala/calendar` already exposes the right navigation seam:

```js
calendar.gotoDate("2026-09-10");
```

A minimal sidebar navigator therefore looks like this:

```html
<date-calendar id="mini"
               selection="none"
               fixed-weeks
               show-week-numbers></date-calendar>

<calendar-view id="agenda"></calendar-view>
```

```js
const mini = document.querySelector("#mini");
const agenda = document.querySelector("#agenda");

// The agenda anchor stays application state, not a model property.
let anchorDate = agenda.getAttribute("date");

mini.dateState = (date) => ({
  description: date === anchorDate ? "Shown in the agenda" : "Navigate to this date",
  anchor: date === anchorDate,
});

mini.addEventListener("dateactivate", (event) => {
  agenda.gotoDate(event.detail.date);
});

agenda.addEventListener("calendar:datechange", (event) => {
  anchorDate = event.detail.date.toString();
  mini.display = anchorDate.slice(0, 7);
});
```

Do not anchor the mini calendar with `mini.focusedDate = date`. `display` and `focusedDate` are deliberately coupled: `setDisplay` re-clamps the focused day into the rendered month (`calendar-model.js`), because the roving-tabbable grid cell must stay visible (ARIA grid contract). So `focusedDate` is the keyboard target, never an application anchor. Keep the anchor in your own state and decorate it through the existing `dateState` / `renderDay` seams.

Notice what else is missing: the mini calendar does not need a selected value. The agenda anchor is application/calendar state, not form selection state.

## Active week / availability decoration

Application state can decorate the mini calendar without changing its navigation semantics:

```js
mini.dateState = (date, sourceState) => ({
  ...sourceState,
  description: isBookable(date)
    ? "Bookable; activate to navigate"
    : "Closed; activate to navigate"
});

mini.renderDay = (date, state) => state.available ? "•" : "";
```

A closed day can still navigate an administrative agenda. Do not set `disabled` merely because booking is unavailable unless activation itself is forbidden for this particular calendar.

That distinction mirrors the showcase rule: navigation policy and booking policy are different concerns.

## Shared month math

Both packages expose month-week derivation. They stay **deliberately duplicated**, each owning its own contract:

- `@lekoala/calendar` owns Temporal-based math (`Temporal.PlainDate`).
- `@lekoala/date-picker` owns civil string math (`dates.getMonthWeeks()`, `YYYY-MM-DD`).

This keeps the two packages dependency-free from each other: a circular dependency between a picker and a scheduler would cost more than a few duplicated lines. `dates.getMonthWeeks()` keeps the scheduler's important contract (full civil weeks, configurable first day, 4–6 rows, no forced padding) so both stay interchangeable for the mini-calendar seam. A future shared `@lekoala/date-math` package is possible, but only as a separate proposal; it must not introduce a circular dependency.

## App-owned range endpoint drag

`<date-picker range>` does not implement pointer dragging of endpoints ([D9](DECISIONS.md)). An application that wants it reads the stable day-cell markers and writes the public API: it never touches picker internals.

```js
const picker = document.querySelector("date-picker[range]");
const calendar = picker.calendar;
const inputs = {
  start: picker.querySelector("input[data-range-start]"),
  end: picker.querySelector("input[data-range-end]"),
};

const isoAt = (x, y) => {
  const element = document.elementFromPoint(x, y);
  const cell = element instanceof Element ? element.closest("[data-date]") : null;
  return cell?.getAttribute("data-date") || "";
};

const isEditable = (bound) =>
  !inputs[bound].matches(":disabled") && !inputs[bound].readOnly;

const clamp = (date, bound, range) =>
  bound === "start"
    ? range.end && date > range.end ? range.end : date
    : range.start && date < range.start ? range.start : date;

let armed = null;
let gesture = 0; // app-owned intent generation

calendar.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
  const cell = event.target.closest("[data-date]");
  const range = picker.range;
  if (!cell || !range?.start || !range?.end) return;
  const start = cell.hasAttribute("data-range-start");
  const end = cell.hasAttribute("data-range-end");
  if (start === end) return; // no handle on a one-day range
  const bound = start ? "start" : "end";
  if (!isEditable(bound)) return;
  event.preventDefault(); // otherwise Firefox starts a text-selection drag
  armed = { id: ++gesture, bound };
  calendar.setPointerCapture(event.pointerId);
});

calendar.addEventListener("pointerup", async (event) => {
  const drag = armed;
  armed = null;
  if (!drag) return;
  if (calendar.hasPointerCapture(event.pointerId)) calendar.releasePointerCapture(event.pointerId);
  const range = picker.range;
  const date = isoAt(event.clientX, event.clientY);
  if (!date || !range?.start || !range?.end) return;
  const next = clamp(date, drag.bound, range);
  if (next === range[drag.bound]) return;
  // Availability plus the cancelable dateactivate veto, in one public call.
  if (!(await calendar.activateDate(next))) return;
  // A newer gesture supersedes this one.
  if (drag.id !== gesture || !picker.open) return;
  picker.range = drag.bound === "start"
    ? { start: next, end: range.end }
    : { start: range.start, end: next };
  inputs[drag.bound].dispatchEvent(new Event("input", { bubbles: true }));
  inputs[drag.bound].dispatchEvent(new Event("change", { bubbles: true }));
});

calendar.addEventListener("pointercancel", () => { armed = null; });
```

The contract this relies on, covered by `test/browser/app-owned-drag.spec.js`:

- a slow source writes nothing until `activateDate()` resolves;
- a cancelled `dateactivate` leaves the range untouched;
- the older of two pending gestures never wins (the app owns its generation);
- one `rangechange`, plus `input`/`change` only on the bound that moved.

Differences from the removed built-in drag:

- touch is application-owned (the picker no longer ships `touch-action` or capture rules);
- the cursor affordance (`data-range-drag`) is gone; style your own;
- writing `picker.range` reformats both committed fields, so a draft typed in the *other* bound is discarded. Call `picker.validate()` first if that draft must be preserved.
