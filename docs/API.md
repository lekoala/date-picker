# API

The API is intentionally small and still provisional while the prototype is exercised against real forms and the calendar showcase.

## `<date-calendar>`

### Attributes / properties

| Name | Type | Default | Meaning |
| --- | --- | --- | --- |
| `value` | `YYYY-MM-DD` | `""` | Selected date. |
| `display` | `YYYY-MM` | value/today month | Month being rendered. |
| `min` | `YYYY-MM-DD` | `""` | Earliest activatable date. |
| `max` | `YYYY-MM-DD` | `""` | Latest activatable date. |
| `first-day` | `0..6` | `1` | First weekday; Sunday=0, Monday=1. |
| `locale` | BCP 47 string | document/navigator | `Intl` locale. |
| `selection` | `single \| none` | `single` | Whether accepted activation updates `value`. |
| `fixed-weeks` | boolean | false | Render six rows; date math itself stays 4–6. |
| `show-week-numbers` | boolean | false | Show ISO week numbers. |

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

`renderDay` only decorates `.dp-day-extra`; it cannot replace the interactive cell.

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
- `max`.

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
