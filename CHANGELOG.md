# Changelog

## Unreleased

### Added

- Native time companions: one or two `input[type=time]` marked `[data-time-start]` / `[data-time-end]` beside the date. They stay fully native (own `name`/`value`/submission, no hidden input, no `picker.time` property); `value` stays a `YYYY-MM-DD` date, the picker only enforces from/to order and aggregates validity in `validate()`. Range mode leaves marked times native with a console warning. Datetime composition + timezone stay application/server-owned (D5).
- `<date-calendar>` month/year controls follow the `Intl` locale order (new `monthYearOrder()` helper; year-first for e.g. `ja` / `zh-CN`). The order is direction-independent: locale decides the linguistic order, `dir` only mirrors the layout.
- RTL through the inherited `dir` (no `isRTL` option): the header grid mirrors, the prev/next glyphs mirror via CSS, and actions plus ArrowLeft/ArrowRight stay chronological. Includes an Arabic-locale smoke test.
- Documented date + native time companions submit contract (`appointment[date]` / `appointment[time]`, from/to, future range projection); the core never builds a combined datetime.
- Five semantic CSS tokens so compact consumers (e.g. a mini-month sidebar) stay on the public surface: `--dp-header-control-size`, `--dp-header-block-gap`, `--dp-nav-gap`, `--dp-year-inline-size`, `--dp-day-radius`. Default rendering is unchanged.
- `month-format="short"` for compact headers: the month select shows abbreviated month names (anything else falls back to `long`); the accessible grid heading always keeps the long form. Forwarded from `<date-picker>` to its popup calendar.

### Fixed

- Keyboard navigation across a month boundary no longer snaps focus back onto the old date when it reappears as outside-month padding (`fixed-weeks` / edge weeks).
- A focused disabled day restores full opacity (muted number kept), so the focus outline and the date stay readable instead of washed out.
- A selected day outside the displayed month keeps accent-contrast text on the accent fill (the outside-month tint no longer overrides selection text).
- Header controls (month select, year input, nav buttons) share explicit vertical metrics, so compact `--dp-header-control-size` values render at equal heights instead of exposing UA padding differences.
- Long month names in a narrow track truncate with an ellipsis instead of painting under the native select caret.

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