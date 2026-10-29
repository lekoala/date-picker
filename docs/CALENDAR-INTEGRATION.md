# Integration with @lekoala/calendar

The mini calendar is intentionally a consumer of the date-picker package, not a feature duplicated inside the scheduling engine.

The live integration lives in `demo/index.html` (card 8): a real `<calendar-view view="month">` is wired to the mini calendar. `@lekoala/calendar` (and its `temporal-polyfill` peer) are dev dependencies used by the demo only.

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

`<date-picker range>` owns the range workflow, not pointer interaction ([D9](DECISIONS.md)). This recipe is a **tested starting point**, not a feature-equivalent replacement for the removed built-in drag: it shows the public seams and the guarantees they give, and leaves the gesture policy to the application.

```js
const picker = document.querySelector("date-picker[range]");
const calendar = picker.calendar;
const inputs = {
  start: picker.querySelector("input[data-range-start]"),
  end: picker.querySelector("input[data-range-end]"),
};

const TRAVEL = 4; // px; below this a press never moves a bound
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

const cancel = () => { armed = null; };

calendar.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
  armed = null; // a new primary press supersedes a stale gesture
  const cell = event.target.closest("[data-date]");
  const range = picker.range;
  if (!cell || !range?.start || !range?.end) return;
  const start = cell.hasAttribute("data-range-start");
  const end = cell.hasAttribute("data-range-end");
  if (start === end) return; // no handle on a one-day range
  const bound = start ? "start" : "end";
  if (!isEditable(bound)) return;
  event.preventDefault(); // otherwise Firefox starts a text-selection drag
  armed = { id: ++gesture, bound, x: event.clientX, y: event.clientY };
  calendar.setPointerCapture(event.pointerId);
});

calendar.addEventListener("pointerup", async (event) => {
  const drag = armed;
  armed = null;
  if (!drag) return;
  if (calendar.hasPointerCapture(event.pointerId)) calendar.releasePointerCapture(event.pointerId);
  const travelled =
    Math.abs(event.clientX - drag.x) > TRAVEL || Math.abs(event.clientY - drag.y) > TRAVEL;
  if (!travelled) return;
  const range = picker.range;
  const date = isoAt(event.clientX, event.clientY);
  if (!date || !range?.start || !range?.end) return;
  const next = clamp(date, drag.bound, range);
  if (next === range[drag.bound]) return;
  // Availability plus the cancelable dateactivate veto, in one public call.
  if (!(await calendar.activateDate(next))) return;
  // A newer gesture supersedes this one, and a concurrent range change wins.
  if (drag.id !== gesture || !picker.open) return;
  const current = picker.range;
  if (!current || current.start !== range.start || current.end !== range.end) return;
  picker.range = drag.bound === "start"
    ? { start: next, end: range.end }
    : { start: range.start, end: next };
  inputs[drag.bound].dispatchEvent(new Event("input", { bubbles: true }));
  inputs[drag.bound].dispatchEvent(new Event("change", { bubbles: true }));
});

calendar.addEventListener("pointercancel", cancel);
calendar.addEventListener("lostpointercapture", cancel);
```

What the recipe implements, and `test/browser/app-owned-drag.spec.js` covers:

- a **travel threshold** (4 px): a press that does not travel far enough never moves a bound;
- a new primary press supersedes any stale armed gesture; `pointercancel` and `lostpointercapture` abandon it;
- pointer capture, so a drag that leaves the grid still ends correctly;
- the bound the gesture started on, clamped against the opposite bound;
- availability plus the cancelable `dateactivate` veto through `activateDate()`;
- an app-owned generation, so the older of two pending gestures never wins;
- a committed-range check after the await, so a programmatic or validation-driven `rangechange` during availability wins;
- one `rangechange`, plus native `input`/`change` only on the bound that moved.

What stays application-owned, and is **not** provided by this recipe:

- touch: the recipe handles mouse and pen only; add `touch-action`, a threshold and long-press policy if you need touch dragging;
- a cursor affordance: the removed `data-range-drag` styling is gone, style your own;
- a draft typed in the *other* bound: writing `picker.range` reformats both committed fields, so the draft is discarded;
- a mid-flight active-endpoint switch: the recipe applies the bound the gesture started on.

The component still guarantees the parts that belong to it: the activation is availability-checked and cancellable, and only a displayable (ordered) pair is ever forwarded to `highlightedRange`.
