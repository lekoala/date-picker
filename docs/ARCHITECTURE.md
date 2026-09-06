# Architecture

## Goal

The package should remain much smaller than a scheduling calendar while covering the cases where a normal date field stops being enough.

The key architectural rule is that **the calendar is the primitive and the picker is a composition**.

```text
civil date helpers
       ↓
CalendarModel
       ↓
<date-calendar> ── source / date state / day decoration
       ↓
<date-picker> ─── input / parse+format / Popover / floating
       ↓
linkDateRange() or application navigation
```

## 1. Civil dates are the canonical model

Public values are `YYYY-MM-DD` strings. Public months are `YYYY-MM` strings.

A selected date is not an instant. The core therefore does not expose a JavaScript `Date`, epoch milliseconds, UTC conversion, timezone or `Temporal` object as the canonical API.

`Date` is used internally only as a browser primitive for safe UTC calendar arithmetic and `Intl.DateTimeFormat` presentation.

This keeps form values predictable and avoids accidental midnight/timezone conversions.

## 2. Four distinct concepts

The component must never collapse these concepts:

```text
display   = month currently rendered
focus     = current keyboard target
activate  = date explicitly actioned by click / Enter / Space
value     = selected date
```

Examples:

- changing the month select changes `display`, not `value`;
- pressing ArrowRight changes `focus`, not `value`;
- pressing Enter emits `dateactivate`;
- in `selection="single"`, accepted activation also updates `value`;
- in `selection="none"`, activation is left entirely to the consumer.

This is what lets the same `<date-calendar>` power both a date picker and the mini-calendar beside `@lekoala/calendar`.

## 3. True month math vs presentation

`dates.getMonthWeeks()` returns the true civil weeks that cover a month: 4, 5 or 6 full rows.

It does not know whether the UI wants a stable height.

`<date-calendar fixed-weeks>` pads the rendered grid to six rows. That choice belongs to presentation, not date math.

This mirrors the existing `@lekoala/calendar` direction: surrounding UI can consume the same true month primitive and decide how to display it.

## 4. DOM ownership

`<date-calendar>` owns the grid structure, focus semantics and interactive cells. A consumer cannot replace the day `td`.

Two extension seams are intentionally narrow:

### `dateState(date, sourceState)`

Returns state/metadata for one day. The core reads only generic fields such as:

- `disabled`;
- `description`.

Everything else remains application metadata.

### `renderDay(date, state)`

Returns a `Node`, `DocumentFragment`, string or nothing. The result is appended inside `.dp-day-extra`, which is non-interactive and `aria-hidden`.

Accessible meaning belongs in `state.description`, not in purely visual dots/badges.

This prevents rich decorations from breaking grid semantics or keyboard behavior.

## 5. Constraints have one resolution path

`calendar.getDateState(date)` composes:

1. remote/source state;
2. `dateState()` application state;
3. `min` / `max`;
4. `isDateDisabled()`.

`enabled: true` is the explicit exception seam: it can reopen a date disabled by generic/source rules, but never bypasses hard `min`/`max` bounds.

Both click activation and typed picker validation use this resolved state.

There should not be one "disabled" implementation for the grid and another for manual text input.

## 6. Async source contract

A source is either a function or an object with `load()`:

```js
load({ start, end }, { signal })
```

The range is inclusive and covers the cells actually rendered for that month. With `fixed-weeks`, this can extend beyond the month itself.

Navigation cancels superseded loads using `AbortController`. Results are normalized to a map keyed by date.

Supported response shapes:

```js
{ dates: { "2026-09-10": {...} } }
{ "2026-09-10": {...} }
[{ date: "2026-09-10", ...state }]
```

No server URL, query parameter names or backend schema are hard-coded into the core. `createFetchSource()` is only a convenience adapter.

## 7. Picker composition

`<date-picker>` enhances a direct child text input.

The visible input owns:

- label association;
- focus;
- typing;
- required state;
- validation UI;
- the localized display string.

A hidden input receives the original `name` and owns canonical form submission. This avoids Flatpickr's "pretty format means no editable input" tradeoff while preserving ordinary form submission.

The picker creates a `<date-calendar selection="none">` in a native manual popover. On `dateactivate`, it commits the canonical value, formats the visible input and closes the popup.

## 8. Popup responsibilities

Native Popover owns the top layer. `@lekoala/floating` owns coordinates and geometry updates.

The picker does not implement:

- custom portals;
- dropdown parent options;
- manual clipping calculations;
- z-index escalation APIs.

The popup remains in authored DOM, preserving inherited locale/theme/density context.

## 9. Range relationships stay external

`linkDateRange(start, end)` applies a relationship between two ordinary pickers:

```text
end.min = max(authorMin, start.value)
start.max = min(authorMax, end.value)
```

It does not auto-correct values. If a new start date makes the current end invalid, the end input becomes invalid and the user decides what value replaces it.

A future `<date-range>` wrapper can be built on this primitive without changing picker internals.

## 10. Keep the class small

If `DateCalendarElement` or `DatePickerElement` starts absorbing pure rules, move them out.

Expected homes:

- date arithmetic → `date.js`;
- locale parsing/formatting → `intl.js`;
- state transitions → `calendar-model.js`;
- payload normalization/fetch adapter → `source.js`;
- start/end relationship → `date-range.js`.

Do not add a plugin system to solve a one-off rendering need.
