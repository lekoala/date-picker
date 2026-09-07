# Changelog

## 0.1.1 — 2026-09-07

### Fixed

- `first-day="7"` no longer falls back silently to Monday: `7` is now a pure Sunday alias of `0`, so passing `@lekoala/calendar`'s ISO 1..7 weekday to the grid keeps the columns aligned. `normalizeFirstDay()` backs `startOfWeek` / `endOfWeek` / `getMonthWeeks` / `weekdayNames` and `CalendarModel`; values `2..6` keep their meaning and other values still throw (helpers) or fall back to `1` (attribute).
- The grid `<h2>` heading is now visually hidden (`dp-visually-hidden`) instead of duplicating the month/year selects while still naming the grid via `aria-labelledby` and keeping its `aria-live="polite"` announcement channel.

### Docs

- `show-week-numbers` documents that the ISO week column renders only when `first-day === 1` (Monday-first); with Sunday-first (`0`/`7`) it is silently withheld.
- `docs/CALENDAR-INTEGRATION.md` no longer recommends `focusedDate` as the agenda anchor: `display` and `focusedDate` are coupled (the roving-tabbable cell must stay visible), so the anchor belongs in application state decorated through `dateState` / `renderDay`. The demo now renders a visible anchor marker.

## 0.1.0 — 2026-09-07

Initial public release. The interaction contract, event names, public styling tokens (`--dp-*`) and component API are frozen; internal DOM/class names remain `.dp-*` implementation details.

### Added

- **`<date-calendar>`** inline calendar primitive:
  - separate `display` (month), `focusedDate` (roving keyboard target) and `value` (selected date); activation exposed as `dateactivate`;
  - `selection="none"` for mini-calendar/navigation use that never touches `value`;
  - `highlightedRange` presentation-only range band (`data-range-start` / `data-in-range` / `data-range-end` + accessible labels, forced-colors aware);
  - month/year navigation, `fixed-weeks`, `show-week-numbers`, `min` / `max`, `isDateDisabled`, `dateState`, `renderDay`;
  - abortable async `source` contract with stale-response protection.
- **`<date-picker>`** editable localized field with hidden canonical `YYYY-MM-DD` submission, native Popover + `@lekoala/floating`, `open-on-focus`, form reset/defaultValue, dynamic `name`/`form`, `readonly` / `disabled`, typed validation against the same resolved date state as the grid.
- **`<date-picker range>`** — two editable fields sharing one calendar surface (`[data-range-start]` / `[data-range-end]`), atomic `range` API with a single `rangechange`, active-endpoint interaction, cross-bound order validation, and supersession of stale async responses.
- **`linkDateRange(start, end)`** — external relationship between two independent pickers.
- **`dates`** pure civil-date helpers without `Date`/timezone/Temporal types in the public API.
- 16 locale message dictionaries (`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `it`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `pt-PT`, `ru`, `tr`, `zh-CN`); all locale-shape formatting comes from `Intl`.
- Custom-elements manifest (`custom-elements.json`), generated `dist/` bundles and TypeScript declarations.

### Known limits

- The popup is non-modal (`aria-modal` absent) by design.
- In-place single-calendar range *selection* interaction is deferred; ranges are chosen through `<date-picker range>` or two linked pickers.
- Human screen-reader matrix (NVDA/VoiceOver/TalkBack) is still to be recorded in `docs/AT-CHECKLIST.md`.