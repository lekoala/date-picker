# Use cases

These cases define the product more strongly than a feature checklist. A proposed API change should be tested against them before being accepted.

## U1 — Editable localized date field

A user can type `06/09/2026` in `fr-BE`, open the calendar, select the same date visually, and submit `2026-09-06` to the server.

Acceptance:

- input remains editable;
- label still targets the real input;
- required/custom validity still works;
- display formatting does not leak into submitted data.

## U2 — Inline selector

An inline calendar owns one selected date.

Acceptance:

- month/year navigation does not change the value;
- arrow-key focus does not change the value;
- click/Enter/Space activates and selects;
- today, focused and selected are visually/semantically distinct.

## U3 — Mini calendar navigator

An inline `selection="none"` calendar navigates a separate agenda/calendar.

Acceptance:

- there may be no selected value at all;
- changing month/year only changes what the mini calendar displays;
- activating a date dispatches `dateactivate` and the application calls `calendarView.gotoDate(date)`;
- outside-month days remain activatable;
- six-row height is available as presentation, not baked into month math;
- ISO week numbers are available.

## U4 — Constrained dates

Example: only the next 90 days, weekdays only.

Acceptance:

- min/max affect both activation and typed validation;
- custom disabled days can still receive keyboard focus so the reason can be announced;
- disabled activation never changes the value;
- previous/next controls stop at bounded months.

## U5 — Linked start/end dates

Two fields represent a range.

Acceptance:

- end cannot validate before start;
- start cannot validate after end;
- changing one side revalidates the other;
- the component never silently rewrites the sibling value;
- each picker remains independently usable and replaceable.

## U6 — Remote availability

Changing the displayed month loads per-day state from a backend.

Acceptance:

- load receives the actual rendered range;
- superseded navigation aborts the previous request;
- state can disable a day or describe it;
- loading logic is independent of URL/backend format;
- a typed date can call `ensureDate()` before validation.

## U7 — Morning / afternoon indicators

A date can carry richer state such as morning/afternoon availability.

Acceptance:

- the business fields remain opaque to core logic;
- visual badges/dots live inside the owned day cell;
- accessible meaning is supplied through `description`;
- custom rendering cannot replace focus/ARIA semantics.

## U8 — Keyboard-only operation

Everything above works without a pointing device.

Acceptance:

- one grid cell in the Tab sequence;
- arrows, Home/End, PageUp/PageDown, Shift+PageUp/PageDown work;
- changing display follows keyboard focus when focus crosses a month;
- activation requires Enter/Space;
- Escape closes the picker and restores a sensible focus target;
- month/year selects remain normal native controls.

## Not a use case for this package

Do not grow the API to cover these without a separate design:

- time slots;
- duration picking;
- timezone conversion;
- appointment recurrence;
- resource scheduling;
- drag/drop;
- event rendering;
- multi-day scheduler views.

Those belong to `@lekoala/calendar` or application logic.
