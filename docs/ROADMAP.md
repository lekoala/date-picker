# Roadmap

## P0 — prove the contracts

- [x] canonical civil-date helpers;
- [x] true month weeks;
- [x] `value / display / focused` split;
- [x] inline `<date-calendar>`;
- [x] navigation-only selection mode;
- [x] month/year controls;
- [x] APG-style grid keyboard interaction;
- [x] localized editable adapter;
- [x] `<date-picker>` Popover + floating composition;
- [x] source contract with AbortController;
- [x] day state + safe decoration seam;
- [x] start/end linking primitive;
- [x] unit/browser test skeleton;
- [x] demos and architecture docs.

## P1 — harden before 0.1

- [x] run TypeScript 7/Biome/Bun checks in the actual repo;
- [x] run Playwright on all engines;
- [x] manual AT checklist and record ([docs/AT-CHECKLIST.md](AT-CHECKLIST.md)); a human pass still to be logged there;
- [x] add a real `@lekoala/calendar` mini-calendar integration demo;
- [x] validate Popover behavior inside `<dialog>` and nested app surfaces;
- [x] test form reset, disabled toggles and dynamic name/form ownership;
- [x] decide exact event naming — flat `dateactivate` etc. ([DECISIONS.md](DECISIONS.md), D1);
- [x] decide whether `selection="none"` is the final public spelling — yes (D2);
- [x] decide public styling tokens/class names — `--dp-*` public, `.dp-*` internal (D3);
- [x] add custom-elements manifest once names stabilize — `custom-elements.json`;
- [x] add package/generated-artifact checks like `@lekoala/combobox`;
- [x] commit `bun.lock` and freeze installs in CI.

## P2 — real-world migration

Use Formidable/Flatpickr cases as migration fixtures:

- remote enable/disable payload;
- date markers/events → metadata/decoration;
- French/Spanish locale;
- initial canonical values;
- inline calendar;
- linked start/end fields;
- month navigation source refresh.

## Explicitly deferred

These should require a separate proposal, not opportunistic growth:

- time picker / datetime picker;
- single-grid visual range selection;
- month-as-value picker;
- multi-date;
- recurrence;
- timezone-aware values;
- natural-language parsing;
- plugin registry;
- multiple visible months;
- swipe gestures;
- full calendar/scheduler features.

## Open UI nomenclature reference

Cross-check our coverage against the Open UI datepicker research: <https://open-ui.org/components/datepicker.research/> — a cross-design-system vocabulary inventory for date pickers (2023, no longer maintained). It is a term checklist, not a behavior specification; normative behavior stays with the WAI-ARIA APG grid/dialog patterns and the HTML spec. Use these terms as-is in proposals instead of re-defining them.

| Open UI concept | Status | Note |
| --- | --- | --- |
| `open` | core | `show()` / `hide()` with a read-only `open` getter (D4). |
| `navigation` | core | month/year selects plus prev/next buttons (P0). |
| `selected` | core | `aria-selected` mapped from `value`. |
| `disabled` | core | native disabled state on the component and its controls. |
| `disabled dates` | core | `min` / `max`, `isDateDisabled`, source state (P0). |
| `required` | core | forwarded to the visible native input. |
| `manual input` | core | editable native field with localized parsing (U1). |
| `format` | core | `intl.js`; format hint exposed via `aria-describedby`. |
| `error` | core | distinct `setCustomValidity` messages for invalid vs unavailable dates. |
| `readonly` / `disabled` | core | native semantics kept separate (D4). |
| `default` | core | form reset via `defaultValue` (D4). |
| `clear` | contract boundary | no internal clear button; clearing happens by editing the text input (D4). |
| `custom cells` | contract boundary | `renderDay()` only; cells stay component-owned (D3). |
| `weeknumber` | contract boundary | `show-week-numbers` (U3). |
| `custom weeks` | no | only the `first-day` attribute; no custom week rendering. |
| `range` | external | `linkDateRange()` between two pickers (U5). |
| `range selected` | deferred | single-grid range selection needs its own proposal. |
| `range presets` | deferred | application-owned. |
| `date-time picker` | deferred | time/datetime is explicitly out of scope. |
| `side by side` | deferred | maps to "multiple visible months". |
| `footer` | deferred | not part of the grid contract. |
| `shape`, `size`, `compact`, `subtle`, `light`, `borderless`, `no icon` | app-owned | styling via public `--dp-*` tokens (D3), not a component API. |
