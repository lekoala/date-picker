# Changelog

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