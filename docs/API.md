# API

The public surface — flat event names, `selection` values, `--dp-*` styling tokens and the `dateactivate`/`renderDay()` seams — is frozen in [DECISIONS.md](DECISIONS.md). Everything else stays internal and is free to change within the same major version.

## `<date-calendar>`

### Attributes / properties

| Name                | Type             | Default            | Meaning                                      |
|---------------------|------------------|--------------------|----------------------------------------------|
| `value`             | `YYYY-MM-DD`     | `""`               | Selected date.                               |
| `display`           | `YYYY-MM`        | value/today month  | Month being rendered.                        |
| `min`               | `YYYY-MM-DD`     | `""`               | Earliest activatable date.                   |
| `max`               | `YYYY-MM-DD`     | `""`               | Latest activatable date.                     |
| `first-day`         | `0..6` (`7` alias) | `1`                | First weekday; Sunday=0, Monday=1. `7` is accepted as an ISO-style alias of Sunday (`@lekoala/calendar` uses 1..7) and never shifts the grid. Other values fall back to Monday. |
| `locale`            | BCP 47 string    | document/navigator | `Intl` locale.                               |
| `month-format`      | `long \| short`  | `long`             | Visible month-name style in the month select; anything else falls back to `long`. The accessible grid heading always keeps the long month/year form. |
| `selection`         | `single \| none` | `single`           | Whether accepted activation updates `value`. |
| `fixed-weeks`       | boolean          | false              | Render six rows; date math itself stays 4–6. |
| `show-week-numbers` | boolean          | false              | Show ISO week numbers. The column renders only when `first-day === 1` (Monday-first): the ISO week and the displayed week only coincide then. With Sunday-first (`0`/`7`) the column is silently withheld. |

`focusedDate` and `highlightedRange` are properties rather than reflected attributes.

### `highlightedRange`

Presentation-only range band. It never changes `value`, `selection` or `focusedDate`. It accepts an ordered `{ start, end }` pair of `YYYY-MM-DD` values; `end` may be empty (range in progress), and a `start === end` range renders both endpoints with a dedicated label. `null` and `{ start: "", end: "" }` reset the band. Inverted ranges and `{ start: "", end: "…" }` throw a `TypeError` — the property never reorders or guesses. Styled spans render `data-range-start="true"`, `data-in-range="true"`, `data-range-end="true"` and extend each day's `aria-label` accordingly.

### Callback properties

```js
calendar.isDateDisabled = (date) => boolean;
calendar.dateState = (date, sourceState) => ({
  disabled,
  enabled, // true = lifts isDateDisabled() only; never min/max or resolved disabled
  description,
  ...applicationMetadata
});
calendar.renderDay = (date, state) => Node | string | null;
```

`renderDay` decorates the day cell; it cannot replace the interactive cell. The returned node is placed inside a component-owned, non-interactive container that is `aria-hidden`. That container has no stable class name: style the nodes you return, not the component's internals (see [DECISIONS.md](DECISIONS.md#d3--css--dp--is-public--dp--is-not)).

### Source

```js
calendar.source = async ({ start, end }, { signal }) => payload;
```

or:

```js
calendar.source = {
  load({ start, end }, { signal }) { ... }
};
```

### Methods

```js
calendar.previousMonth();
calendar.nextMonth();
calendar.focusDate("2026-09-10");
calendar.focusGrid();
calendar.getDateState("2026-09-10");
await calendar.activateDate("2026-09-10");
await calendar.ensureDate("2026-09-10");
await calendar.refreshSource();
calendar.render();
```

### Events

#### `dateactivate`

Cancelable. Fired for an allowed date after explicit click / Enter / Space.

```js
calendar.addEventListener("dateactivate", (event) => {
  console.log(event.detail.date, event.detail.state);
});
```

Cancel it to refuse the activation before selection:

```js
calendar.addEventListener("dateactivate", (event) => {
  if (applicationRule(event.detail.date)) event.preventDefault();
});
```

`activateDate(date)` runs that same path on demand: availability check, then
the cancelable event, then selection. Click, keyboard and the range endpoint
drag all go through it, so an application that cancels `dateactivate` cannot be
bypassed by a different input device.

#### `datefocus`

Fired when a date cell actually receives focus, with `{ date, state }`. Arrow,
Home, End, PageUp and PageDown all emit one through the cell that took focus.

```js
calendar.addEventListener("datefocus", (event) => {
  console.log(event.detail.date);
});
```

It observes navigation and nothing else: a disabled day still reports it (grid
navigation stays discoverable), hover never does, and assigning `focusedDate`
without moving DOM focus stays silent. The three verbs are distinct —
`datefocus` observes, `dateactivate` requests an activation, `datechange`
observes a selection.

#### `datechange`

Fired when `selection="single"` changes `value`.

#### `dateinvalid`

Fired when the user tries to activate a disabled/out-of-range date.

#### `displaychange`

```js
{
  display: "2026-10",
  start: "2026-09-28",
  end: "2026-11-08"
}
```

The range reflects rendered cells (and therefore includes six-row padding when enabled).

#### Source lifecycle

- `dateloadstart`
- `dateloadend`
- `dateloaderror`

## `<date-picker>`

Markup:

```html
<label for="arrival">Arrival</label>
<date-picker value="2026-09-10" locale="en-GB">
  <input id="arrival" name="arrival" required>
</date-picker>
```

The direct child text input is required. On enhancement its original `name` moves to an internal hidden input that submits the canonical ISO value.

### Attributes / properties

- `value` — canonical selected date;
- `locale`;
- `min`;
- `max`;
- `open-on-focus` — boolean (default `true`): open the popover when the input receives focus without moving focus; `open-on-focus="false"` keeps focus alone passive;
- `month-format` — `long | short` (default `long`): visible month-name style forwarded to the popup calendar;
- `open` — read-only: whether the popover is shown;
- `openOnFocus` — property form of `open-on-focus`.

### Native form semantics

- `disabled` — non-editable, popup cannot open, field is not submitted.
- `readonly` — non-editable, value is still submitted, popup cannot open (the trigger is disabled).
- Clearing the editable input clears the canonical value; the component does not render its own clear button.
- `input.defaultValue` (or the input's `value` attribute) is the source of truth for the next `form.reset()`, which restores canonical + visible representations and revalidates.

### Forwarded callback properties

- `source`;
- `dateState`;
- `renderDay`;
- `isDateDisabled`;
- `messages`.

### Popup positioning

- `coordinateSpace` — JS-only, `"viewport"` by default.

```text
"viewport"
  panel uses position: fixed
  general/default integration

"document"
  panel uses position: absolute
  explicit optimization when the application knows the picker
  reference moves with root-page scrolling
```

`document` follows the `@lekoala/floating` consumer contract: the picker panel is a top-layer popover, so its absolute positioning resolves against the initial containing block; the application remains responsible for knowing that the `<date-picker>` reference itself moves with the root document. Changing `coordinateSpace` while open configures the next opening, never the current one. See the `@lekoala/floating` documentation for the coordinate-space doctrine.

### Read-only properties

```js
picker.input;
picker.calendar;
```

### Methods

```js
picker.show();
picker.hide();
await picker.validate();
```

### Events

- `valuechange` — canonical value changed;
- `open`;
- `close`.

Calendar selection also dispatches normal bubbling `input` and `change` events on the visible input.

### Time companions

Date with one time:

```html
<date-picker>
  <input name="appointment[date]">
  <input type="time" data-time-start name="appointment[time]">
</date-picker>
```

```text
appointment[date] = 2026-09-10
appointment[time] = 09:30
```

Date with from/to times on the same day:

```html
<date-picker>
  <input name="appointment[date]">
  <input type="time" data-time-start name="appointment[from]">
  <input type="time" data-time-end name="appointment[to]">
</date-picker>
```

```text
appointment[date] = 2026-09-10
appointment[from] = 09:30
appointment[to] = 11:00
```

The submit contract is: `date-picker` owns the civil date selection, the time inputs own their civil time values, the authored HTML `name`s own the submitted structure, and the server/application owns datetime composition plus timezone. The picker never constructs a combined datetime, timestamp or timezone-bearing value.

Future range + time projection (not supported yet — range mode leaves marked times native with a console warning):

```text
period[start][date]
period[start][time]
period[end][date]
period[end][time]
```

Optional native time companions (one or both). They are direct children, fixed at connect time, and stay fully native: no hidden input, no `picker.time` property, no `timechange` event — their `input`/`change` events bubble like the date field's. `value` stays a `YYYY-MM-DD` date. The picker only enforces from/to order (`start <= end`, equality allowed, see [D5](DECISIONS.md)); a missing, empty or `disabled` time lifts the constraint, and `validate()` aggregates date validity, native time validity and that order. Range mode does not support time companions yet: marked times there are left native with a console warning.

## `<date-picker range>` — shared range surface

```html
<date-picker range>
  <input data-range-start name="arrival" aria-label="Arrival">
  <input data-range-end name="departure" aria-label="Departure">
</date-picker>
```

Two editable fields share one calendar popup. The mode is fixed at connect time (`range` attribute + both marked direct child inputs); switching single/range at runtime is not supported in V1.

Each field gets its own calendar trigger, inserted right after it (`start`, then its trigger, `end`, then its trigger), so DOM order matches visual/tab order. Both triggers point at the same popup; activating the other bound's trigger while it is open switches the active bound and keeps it open.

### Strict API

- `range` — atomic get/set of `{ start, end }` (canonical `YYYY-MM-DD`). The setter validates through `normalizeRange` (ISO-only, ordered; inverted throws) and applies both bounds, the visible fields and both hidden fields **before** one `rangechange` event — no intermediate new-start/old-end state is observable.
- `value` — `undefined` in range mode; assigning throws a `TypeError`.
- `input` — `undefined` in range mode; the authored inputs remain the consumer-facing fields.
- `startValue` / `endValue` — deferred; do not exist yet.

Each field keeps its own name, hidden ISO input and validation. There is no `rangeDrop`-style polymorphic pair.

### `rangechange`

```js
picker.addEventListener("rangechange", (event) => {
  console.log(event.detail); // { start, end } — may be incomplete or inverted
});
```

The business range may be temporarily incomplete or inverted; `calendar.highlightedRange` only ever receives a displayable (ordered) range.

### Interaction

- When an ordered range is complete, picking before its start updates only the start; picking after its end updates only the end, regardless of the opening field. The popup closes after this update. An uneditable target bound refuses the activation.
- Otherwise, opening through a field targets that bound (`activeEndpoint`). Picking from `start` commits it, moves the endpoint to `end` without closing, and a second pick commits and closes.
- **Calendar interaction never produces an inverted range.** While a range is being created, a second pick before the anchor is sorted rather than refused: `10` then `15` gives `10 -> 15`, `10` then `5` gives `5 -> 10`, and `10` then `10` a one-day range. That transition moves **both** bounds at once and is applied in a single write — one `rangechange`, with synthetic `input`/`change` on each bound that moved, and no intermediate inverted pair ever observable. Typed text keeps the opposite contract and may be temporarily inverted (see [DECISIONS D6](DECISIONS.md)).
- Changing one bound of an already complete pair keeps that bound's identity: moving `end` before `start` is refused (`dateinvalid`, nothing changes) instead of rewriting the other field.
- **Preview.** While a range is being created, hovering a day or moving the keyboard focus projects the range the next pick would commit onto `calendar.highlightedRange`, and the pick commits exactly what was projected. The projection is visual only: no `rangechange`, no field write, no validation and no source request. It reads the month already loaded, so a day known to be unavailable promises nothing; the real availability check still runs on commit. Pointer hover never moves `focusedDate`, which stays the keyboard target. Leaving the grid, Escape and closing the popup restore the committed band.
- **Endpoint drag.** On a complete, ordered range whose two ends sit on different days, each endpoint can be dragged with a mouse or pen (pointer events plus capture, armed only once the pointer travels). A handle never crosses the other one — the candidate is clamped to it, equality allowed — an unavailable cell is not a drop target, and `pointercancel` restores the committed band. The drop runs the same projection and the same `ensureDate` + cancelable `dateactivate` path as a click, emits one `rangechange`, and keeps the popup open: a drag adjusts a range, it does not validate it. A press without travel stays a plain click. Touch keeps native scrolling and stays a plain tap.
- Each bound owns its trigger (`input[data-range-start]` then its trigger, `input[data-range-end]` then its trigger); the two triggers share **one** popup, calendar, source and state. Pressing the other bound's trigger while the popup is open switches the active bound and keeps it open instead of toggling it shut. A trigger never opens a `readonly`/`disabled` bound.
- Typing stays independent per field. Moving `start` past `end` keeps both values and flags the *modified* bound with `rangeOrderStart`; fixing either side revalidates both. Parse/source errors are never cleared by cross-bound revalidation.
- A stale availability response resolving after the active endpoint changed (or after a newer selection) never commits; a field focus that switches the endpoint invalidates in-flight activations.

## `linkDateRange(start, end)`

```js
const cleanup = linkDateRange(startPicker, endPicker);
```

Keeps effective start/end bounds synchronized and revalidates both inputs. Returns an idempotent-style cleanup function (call once to detach the relationship).

## `normalizeRange` and `rangePosition`

```js
import { normalizeRange, rangePosition } from "@lekoala/date-picker";

normalizeRange({ start: "2026-09-10", end: "2026-09-15" }); // { start, end }
normalizeRange(null); // { start: "", end: "" }
rangePosition("2026-09-12", range); // "start" | "in" | "end" | "single" | ""
```

`normalizeRange` validates an ordered displayable range and never reorders: an inversion or an `end` without a `start` throws. `rangePosition` classifies one day within a displayable range (see [`highlightedRange`](#highlightedrange)).

## `DateRangeController`

The pure two-bound state machine behind `date-picker[range]`. It owns the
selection rules and knows nothing about DOM, popups or async availability.

```js
const model = new DateRangeController();
model.focus("start");
model.activate("2026-09-10"); // { status: "pending", endpoint: "start", … }
model.previewRange("2026-09-05"); // { start: "2026-09-05", end: "2026-09-10" }
model.activate("2026-09-05"); // changedEndpoints: ["start", "end"]
```

- `project(date, editable?)` / `projectEndpoint(date, endpoint, editable?)` describe a transition without applying it;
- `activate(date, editable?)` / `moveEndpoint(date, endpoint, editable?)` apply one;
- `previewRange(date, endpoint?, editable?)` returns the displayable band a candidate would produce, or `null` when there is nothing to promise.

A transition is `{ status, endpoint, changedEndpoints, range, activeEndpoint, close? }`.
`range` is the whole resulting pair, because one interaction can move both
bounds; `changedEndpoints` names the ones that actually move. Every rule exists
once, as a projection, and the previews read the same projections the commit
applies.

## `createDateAdapter(locale)`

Locale-aware editable numeric adapter:

```js
const adapter = createDateAdapter("fr-BE");
adapter.placeholder;             // DD/MM/YYYY
adapter.format("2026-09-06");    // 06/09/2026
adapter.parse("06/09/2026");     // 2026-09-06
```

ISO input is accepted as a fallback even when the locale display is different.

## Locales

Control-message dictionaries ship per locale and can be attached through the `messages` property:

```js
import fr from "@lekoala/date-picker/locales/fr";
calendar.messages = fr;
```

Available tags: `ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `it`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `pt-PT`, `ru`, `tr`, `zh-CN`. `en` mirrors the built-in defaults.

Only the short control labels (choose/change date, month/year names, grid heading, validation messages, format hint, week heading) are locale data. Everything locale-shaped on screen — month/weekday names, the editable pattern and placeholder, parsing and digit normalization — comes from `Intl` via the `locale` attribute, so a dictionary is never required for a new language to display correctly.

## `dates`

Pure helpers are exported as a namespace:

```js
import { dates } from "@lekoala/date-picker";
```

Public helpers:

- `isLeapYear`
- `daysInMonth`
- `parseDate`
- `isDate`
- `monthKey`
- `toISODate`
- `compareDates`
- `addDays`
- `addMonths`
- `addYears`
- `shiftMonth`
- `startOfMonth`
- `endOfMonth`
- `dayOfWeek`
- `startOfWeek`
- `endOfWeek`
- `normalizeFirstDay`
- `getMonthWeeks`
- `clampDate`
- `todayISO`
- `isoWeekNumber`

`normalizeFirstDay(firstDay)` maps `7` to `0` (Sunday) and returns `0..6` unchanged; any other value throws a `RangeError`. It backs `startOfWeek`, `getMonthWeeks` and `weekdayNames`, so those accept `7` as the ISO-style Sunday alias `@lekoala/calendar` uses while `2..6` keep their current meaning.
