# Flatpickr / Formidable migration map

This prototype was scoped against the existing `FlatpickrInput` wrapper rather than against Flatpickr's full feature list.

## Directly covered

| Existing need | New direction |
| --- | --- |
| canonical `Y-m-d` value | `date-picker.value` / hidden form value `YYYY-MM-DD` |
| localized pretty display | `Intl` numeric adapter while staying editable |
| `minDate` / `maxDate` | `min` / `max` |
| disable callback | `isDateDisabled(date)` |
| dynamic enable/disable | source state + `dateState()` |
| `configUrl` on navigation | abortable `source.load({start,end}, {signal})` |
| bars/events on dates | source metadata + `renderDay()` + accessible `description` |
| inline calendar | `<date-calendar>` |
| previous/next month | calendar methods/buttons |
| direct month/year choice | native month/year selects |
| start/end relation | `linkDateRange(start, end)` |
| locale | `Intl` locale + small control-message dictionaries |
| value-changed hook | `valuechange` / native input+change events |

## The display-format change is intentional

The old wrapper has to choose between a rich localized display and manual editing because Flatpickr cannot reliably parse arbitrary long localized output.

The new default is deliberately less decorative and more useful:

```text
fr-BE: 06/09/2026
 en-US: 09/06/2026
```

The pattern is generated with `Intl.DateTimeFormat(...).formatToParts()`, so the same adapter can format and parse it.

Long dates such as `6 septembre 2026` remain presentation content, not the editing format of the field.

## Dynamic source payload

Legacy payload:

```json
{
  "enable": ["2025-06-07"],
  "events": [
    "2025-06-07",
    { "date": "2025-06-09", "class": "bg-danger" }
  ]
}
```

Suggested new payload:

```json
{
  "dates": {
    "2025-06-07": {
      "disabled": false,
      "description": "Available"
    },
    "2025-06-09": {
      "description": "Limited availability",
      "status": "danger"
    }
  }
}
```

The backend returns meaning, not CSS class names. The consumer decides how `status` is rendered.

## Explicit enable-overrides-disable

If an application currently relies on a remote `enable` list overriding a generic disabled rule (for example: weekends disabled except one exceptional Saturday), implement that policy in one `dateState` resolver:

```js
calendar.isDateDisabled = (date) => isWeekend(date);
// Source state { enabled: true } is an explicit exception to the generic
// weekend rule. Hard min/max bounds still win.
```

The prototype promotes this legacy behavior into a documented generic field: `enabled: true` reopens a date disabled by `isDateDisabled()` or ordinary source state, but never bypasses hard `min`/`max` bounds.

## Not migrated into this component

The existing wrapper also exposes Flatpickr features that should not be carried into the date picker core:

- `enableTime`;
- `noCalendar` / time-only;
- confirm-date plugin;
- month-as-value selection plugin.

Those are separate controls/use cases. Adding them here would immediately mix civil-date selection with time and alternate value models.
