# Use cases

These cases define the product more strongly than a feature checklist. A proposed API change should be tested against them before being accepted.

## U1 — Editable localized date field

A user can type `06/09/2026` in `fr-BE`, open the calendar, select the same date visually, and submit `2026-09-06` to the server.

Acceptance:

- input remains editable;
- label still targets the real input;
- required/custom validity still works;
- display formatting does not leak into submitted data;
- typing digits only is enough: separators are inserted from the locale (`29102026` → `29/10/2026`);
- an explicitly typed date (`2/9/2026`) is normalized by the existing parser once complete, and a partial explicit draft is kept as typed rather than redistributed;
- a complete draft that is impossible, out of `min`/`max` or disabled keeps its text, is announced (`aria-invalid`) and never submits the previous ISO value.

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
- ISO week numbers are available;
- a narrow/compact presentation can use short month names (`month-format="short"`).

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

## U9 — Two fields, one shared calendar

A form has two editable date fields (arrival/departure) that share a single calendar surface inside one picker popup.

Acceptance:

- each field stays independently editable and localized, with its own hidden ISO value for submission;
- opening from a bound targets that bound: selecting a first date commits it, moves the active endpoint to the other bound without closing, and a second selection commits and closes;
- once an ordered range is complete, activating before it extends the start and activating after it extends the end, regardless of the opening field; the opposite bound stays unchanged and readonly/disabled bounds remain protected;
- a preloaded range shows the band on open and is never reordered;
- month/year navigation and arrow-key focus never mutate either bound;
- an inverted range (start after end) keeps both entered values and surfaces an order error on the bound that was just modified; changing either side revalidates both;
- form reset restores both fields in one resync;
- a stale async availability response arriving after the active endpoint changed never commits a value or closes the popup;
- calendar interaction never produces an inverted range: while a range is being created, a second selection before the first is sorted (`10` then `5` commits `5 -> 10`) in one atomic update; an explicit change to one bound of an already complete pair keeps that bound's identity instead;
- pointer hover and keyboard navigation project the range the next selection would commit onto the band, without changing any value, and a selection commits exactly what was projected;
- only the bounds are validated; per-night availability stays application-owned.

## U10 — Date with native time companions

A form pairs a date with one or two native times (appointment at `09:30`, from/to on the same day).

Acceptance:

- times stay native `input[type=time]` fields with their own names and submission;
- `value` stays a `YYYY-MM-DD` date;
- an inverted from/to surfaces an order error on the modified bound;
- a missing or disabled time lifts the order constraint;
- calendar selection and form reset keep the entered times.

## U11 — Host design system controls

The calendar header uses application-owned control classes without styling internal `.dp-*` selectors.

Acceptance:

- author classes survive every render;
- the library applies no border, background, caret, padding, hover, disabled or focus skin to a role with author classes;
- controls stretch to equal heights, the year keeps its grid-track width and long month names truncate;
- labels, keyboard navigation and focus restoration are unchanged;
- controls without author classes keep the default skin.

## Not a use case for this package

Do not grow the API to cover these without a separate design:

- time slots;
- duration picking;
- timezone conversion;
- appointment recurrence;
- resource scheduling;
- drag/drop of events or range endpoints (endpoint moves are application-owned, see [DECISIONS D9](DECISIONS.md));
- event rendering;
- multi-day scheduler views.

Those belong to `@lekoala/calendar` or application logic.
