# Integration with @lekoala/calendar

The mini calendar is intentionally a consumer of the date-picker package, not a feature duplicated inside the scheduling engine.

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

Both packages currently expose month-week derivation. The target direction should be one implementation rather than two drifting versions.

This prototype intentionally gives `dates.getMonthWeeks()` the same important contract used by the scheduler:

- full civil weeks;
- configurable first day;
- 4–6 rows;
- no forced six-row padding.

Before publishing 0.1, decide which package owns the tiny shared civil-date helpers (or whether they stay duplicated but contract-tested). Do not create a circular dependency between the date picker and scheduler.
