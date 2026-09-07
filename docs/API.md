# API

The public surface — flat event names, `selection` values, `--dp-*` styling tokens and the `dateactivate`/`renderDay()` seams — is frozen in [DECISIONS.md](DECISIONS.md). Everything else stays internal and free to move before `0.1.0`.

## `<date-calendar>`

### Attributes / properties

| Name                | Type             | Default            | Meaning                                      |
|---------------------|------------------|--------------------|----------------------------------------------|
| `value`             | `YYYY-MM-DD`     | `""`               | Selected date.                               |
| `display`           | `YYYY-MM`        | value/today month  | Month being rendered.                        |
| `min`               | `YYYY-MM-DD`     | `""`               | Earliest activatable date.                   |
| `max`               | `YYYY-MM-DD`     | `""`               | Latest activatable date.                     |
| `first-day`         | `0..6`           | `1`                | First weekday; Sunday=0, Monday=1.           |
| `locale`            | BCP 47 string    | document/navigator | `Intl` locale.                               |
| `selection`         | `single \| none` | `single`           | Whether accepted activation updates `value`. |
| `fixed-weeks`       | boolean          | false              | Render six rows; date math itself stays 4–6. |
| `show-week-numbers` | boolean          | false              | Show ISO week numbers.                       |

`focusedDate` is a property (`YYYY-MM-DD`) rather than a reflected attribute.

### Callback properties

```js
calendar.isDateDisabled = (date) => boolean;
calendar.dateState = (date, sourceState) => ({
  disabled,
  enabled, // true = explicit exception to generic disabled rules
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

## `linkDateRange(start, end)`

```js
const cleanup = linkDateRange(startPicker, endPicker);
```

Keeps effective start/end bounds synchronized and revalidates both inputs. Returns an idempotent-style cleanup function (call once in the current prototype).

## `createDateAdapter(locale)`

Locale-aware editable numeric adapter:

```js
const adapter = createDateAdapter("fr-BE");
adapter.placeholder;             // DD/MM/YYYY
adapter.format("2026-09-06");    // 06/09/2026
adapter.parse("06/09/2026");     // 2026-09-06
```

ISO input is accepted as a fallback even when the locale display is different.

## `dates`

Pure helpers are exported as a namespace:

```js
import { dates } from "@lekoala/date-picker";
```

Current prototype helpers:

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
- `getMonthWeeks`
- `clampDate`
- `todayISO`
- `isoWeekNumber`
