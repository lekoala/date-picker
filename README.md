# @lekoala/date-picker

Small, native-first date picker and inline calendar primitives.

> v0.1: the interaction contract, event names, public styling tokens and the component API are frozen — see [docs/DECISIONS.md](docs/DECISIONS.md). Internal DOM and class names are `.dp-*` implementation details and stay private.

This project fills the gap between a normal editable date field and a full scheduling calendar. A plain date input remains the right answer for simple CMS/editing forms. This component becomes useful when a date has context: availability, disabled days, annotations, remote state, start/end relationships, or a mini calendar that navigates another view.

## The two primitives

### `<date-calendar>`

An inline calendar with real month/year navigation, keyboard support and three distinct pieces of state:

- `display` — the month being rendered (`YYYY-MM`);
- `focusedDate` — the roving keyboard target (`YYYY-MM-DD`);
- `value` — the selected date (`YYYY-MM-DD`, optional).

`display` and `focusedDate` are coupled during navigation/display: changing the displayed month re-clamps the focused day into that month, because the roving-tabbable grid cell must stay visible. `value` and activation stay independent of both.

User activation is exposed separately as `dateactivate`. This is what makes the same calendar useful as a selector **and** as a mini navigator.

```html
<date-calendar value="2026-09-10" fixed-weeks></date-calendar>
```

For a navigator that should not own a selection:

```html
<date-calendar id="mini" selection="none" fixed-weeks show-week-numbers></date-calendar>
<script type="module">
  const mini = document.querySelector("#mini");
  mini.addEventListener("dateactivate", (event) => {
    agenda.gotoDate(event.detail.date);
  });
</script>
```

### `<date-picker>`

A composition around a real editable text input. The user sees and edits a short locale-aware numeric date while form submission stays canonical ISO.

**Use `<date-picker>` when choosing a date benefits from calendar context.** For a simple editable date field, a normal input with formatting and validation is the right tool instead.

```html
<date-picker value="2026-09-10" locale="fr-BE">
  <input name="appointment_date" required>
</date-picker>
```

With JavaScript enabled the input displays `10/09/2026`; the hidden submitted value remains `2026-09-10`. The visible input keeps the label, focus, required state and validation UI.

By default the calendar opens when the field receives focus — without stealing the keyboard focus, so typing works immediately. `open-on-focus="false"` makes the calendar opt-in (trigger button or `ArrowDown`). Under `readonly` the value stays editable-by-calendar-off but is still submitted; under `disabled` the field is also unsubmitted.

## Start/end ranges

Two product shapes cover ranges.

**One shared calendar surface** — two editable fields wired to a single picker popup:

```html
<date-picker range>
  <input data-range-start name="arrival" aria-label="Arrival">
  <input data-range-end name="departure" aria-label="Departure">
</date-picker>
```

Opening from a field targets that bound; picking the first date moves the active endpoint to the other bound without closing, and the second pick completes and closes. `picker.range` is the atomic `{ start, end }` API (single `rangechange` event).

**Two independent pickers** — a small external link for visually separate fields:

```js
import { linkDateRange } from "@lekoala/date-picker";

const cleanup = linkDateRange(startPicker, endPicker);
```

The relationship applies `end >= start` and `start <= end` as effective bounds. Neither picker knows about its sibling.

## Availability and per-day metadata

The calendar accepts a source function or `{ load() }` object with the same abortable shape used elsewhere in LeKoala components:

```js
calendar.source = async ({ start, end }, { signal }) => {
  const response = await fetch(`/availability?start=${start}&end=${end}`, { signal });
  return response.json();
};
```

Accepted payloads are deliberately simple:

```js
{
  dates: {
    "2026-09-10": {
      enabled: true,
      description: "Available morning and afternoon",
      morning: true,
      afternoon: true
    }
  }
}
```

Business metadata is not interpreted by the core. Consumers can add visual content without replacing the grid cell or its accessibility semantics:

```js
calendar.renderDay = (_date, state) => {
  if (!state.morning && !state.afternoon) return "";
  return `${state.morning ? "●" : "○"}${state.afternoon ? "●" : "○"}`;
};
```

## Date math

The public value model is intentionally boring: canonical `YYYY-MM-DD` strings. There is no public `Date`, timestamp, timezone or `Temporal` dependency.

Pure civil-date helpers are exported under `dates`:

```js
import { dates } from "@lekoala/date-picker";

const weeks = dates.getMonthWeeks("2026-09-03", { firstDay: 1 });
```

`getMonthWeeks()` returns the true 4–6 full civil weeks covering the month. It never pads to six rows. `fixed-weeks` is a rendering choice made by `<date-calendar>`.

## Accessibility baseline

The calendar follows the WAI-ARIA date-picker/grid interaction model:

- semantic `table[role="grid"]`;
- one roving `tabindex="0"` grid cell;
- arrow keys move by day/week;
- Home/End move to week boundaries;
- PageUp/PageDown move by month;
- Shift+PageUp/PageDown move by year;
- Enter/Space activate a date;
- keyboard movement never implicitly selects;
- `aria-selected` identifies the selected date;
- `aria-current="date"` identifies today;
- abbreviated weekday headers keep full `abbr` names.

The picker popup uses native Popover for the top layer and `@lekoala/floating` for geometry. It has `role="dialog"`, but it is intentionally **not** marked `aria-modal` because the current implementation does not inert the rest of the document.

When the popup opens on the field's focus, grid navigation is reachable via `ArrowDown` (or the trigger button) so the focus-restore/Escape flow stays predictable.

See [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Install / develop

```bash
bun install
bun run dev
```

If a previous `bun run dev` is still holding port `4859`, clear it with `bun run dev:kill` (or restart in one go with `bun run dev:restart`).

Tooling is aligned with the current LeKoala component repos:

- Bun 1.4.2
- TypeScript 7.0.2 (`checkJs` + declaration emit)
- Biome 2.5.11
- Playwright 1.62.1
- `@lekoala/floating ^0.1.1`

Useful commands:

```bash
bun run test
bun run typecheck
bun run lint
bun run build
bun run test:browser
bun run test:browser:all
bun run check:all
```

## Build outputs

`bun run build` produces:

```text
dist/date-picker.js
dist/date-picker.min.js
dist/date-picker.css
dist/date-picker.min.css
dist/date-picker.standalone.min.js
dist/types/**
```

The default ESM exports point at `src/`, matching the native-first development style of `@lekoala/combobox`. The classic build is file:// friendly; the standalone build additionally injects the component CSS.

## Scope

Included in v0.1:

- inline single-date selection;
- mini-calendar/navigation-only use;
- month and year selection;
- previous/next navigation;
- editable localized input + canonical submitted value;
- min/max and custom disabled rules;
- presentation-only range band (`highlightedRange`);
- shared-calendar two-field range picker (`<date-picker range>`);
- linked start/end pickers (`linkDateRange`);
- async per-day state with cancellation;
- custom day decorations that cannot replace the accessible cell;
- fixed six-row presentation as an opt-in;
- ISO week numbers;
- keyboard and focus contracts.

Deliberately out of scope for v0.1:

- time or datetime picking;
- timezones;
- in-place single-calendar range *selection interaction* (use the two-field picker);
- multi-date selection;
- recurrence;
- natural-language parsing;
- plugin registry;
- virtualized months;
- scheduling/time slots.

## Docs

- [Changelog](CHANGELOG.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [API](docs/API.md)
- [Accessibility checklist](docs/AT-CHECKLIST.md)
- [Use cases](docs/USE_CASES.md)
- [Accessibility](docs/ACCESSIBILITY.md)
- [Testing](docs/TESTING.md)
- [Roadmap](docs/ROADMAP.md)
- [Calendar integration](docs/CALENDAR-INTEGRATION.md)
- [Flatpickr/Formidable migration](docs/MIGRATION-FLATPICKR.md)
