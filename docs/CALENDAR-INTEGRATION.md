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

mini.display = agenda.date.toString().slice(0, 7);
mini.focusedDate = agenda.date.toString();

mini.addEventListener("dateactivate", (event) => {
  agenda.gotoDate(event.detail.date);
});

agenda.addEventListener("calendar:datechange", (event) => {
  const date = event.detail.date.toString();
  mini.display = date.slice(0, 7);
  mini.focusedDate = date;
});
```

Notice what is missing: the mini calendar does not need a selected value. The agenda anchor is application/calendar state, not form selection state.

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
