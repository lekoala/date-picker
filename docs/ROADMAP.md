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

## P1 — hardened before 0.1 (shipped in 0.1.0)

- [x] run TypeScript 7/Biome/Bun checks in the actual repo;
- [x] run Playwright on all engines;
- [x] manual AT checklist and record ([docs/AT-CHECKLIST.md](AT-CHECKLIST.md)); the automated portion is the 0.1 gate, the human reader/OS rows track as a post-0.1 recommendation;
- [x] add a real `@lekoala/calendar` mini-calendar integration demo;
- [x] validate Popover behavior inside `<dialog>` and nested app surfaces;
- [x] test form reset, disabled toggles and dynamic name/form ownership;
- [x] decide exact event naming — flat `dateactivate` etc. ([DECISIONS.md](DECISIONS.md), D1);
- [x] decide whether `selection="none"` is the final public spelling — yes (D2);
- [x] decide public styling tokens/class names — `--dp-*` public, `.dp-*` internal (D3);
- [x] decide the shared-range picker shape — `<date-picker range>` + `linkDateRange` (U9/U5);
- [x] decide the popup modality on touch surfaces — stays non-modal in 0.1 ([ACCESSIBILITY.md](ACCESSIBILITY.md));
- [x] add custom-elements manifest once names stabilize — `custom-elements.json`;
- [x] add package/generated-artifact checks like `@lekoala/combobox`;
- [x] commit `bun.lock` and freeze installs in CI.

## P2 — real-world migration

Use Formidable/Flatpickr cases as migration fixtures:

- remote enable/disable payload;
- date markers/events → metadata/decoration;
- French/Spanish locale → shipped locale message dictionaries (`ar`, `de`, `en`, `es`, `fr`, `hi`, `id`, `it`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `pt-PT`, `ru`, `tr`, `zh-CN`);
- initial canonical values;
- inline calendar;
- linked start/end fields;
- month navigation source refresh.

## Explicitly deferred

These should require a separate proposal, not opportunistic growth:

- time picker / datetime picker;
- single-grid visual **selection** interaction (the band itself is core presentation via `calendar.highlightedRange`);
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
| `range` | core | `<date-picker range>` two-field shared surface (U9); `linkDateRange()` stays external (U5). |
| `range selected` | deferred | selection interaction needs its own proposal; `highlightedRange` covers band presentation only. |
| `range presets` | deferred | application-owned. |
| `date-time picker` | deferred | time/datetime is explicitly out of scope. |
| `side by side` | deferred | maps to "multiple visible months". |
| `footer` | deferred | not part of the grid contract. |
| `shape`, `size`, `compact`, `subtle`, `light`, `borderless`, `no icon` | app-owned | styling via public `--dp-*` tokens (D3), not a component API. |

## Related prior art: Duet Date Picker

<https://github.com/duetds/date-picker> — a Web Components date picker by the Duet Design System (MIT, Stencil, ~10 kb). The repository was **archived in 2024**; treat it as a source of observed behaviors, not maintained API reference. It validates several of our choices and highlights points we must decide:

- `isDateDisabled` (same seam name as ours), hidden-input ISO submission, `formatLongDate`-style cell labels ("17 November 2020"), month/year announced on change, and a real `table[role="grid"]` with a single roving tab stop — all mirrored in this package.
- **Differs from us on the canonical model**: its `dateAdapter` and events work with `Date` objects (`valueAsDate`). That is the exact `Date`-object tradeoff our canonical `YYYY-MM-DD` strings avoid.
- **Differs on modality**: it ships a modal dialog with overlay and an explicit close button, while our popup intentionally stays non-modal (`aria-modal` absent). `docs/ACCESSIBILITY.md` still holds the open question of going modal on small/touch surfaces.
- **Tab wrap-around**: Duet cycles focus back to the first focusable element inside the dialog. Our non-modal popup lets Tab leave the picker — decided, documented in `docs/ACCESSIBILITY.md`.
- **Opening focus target**: Duet moves focus to the first (month) select on open; we focus the grid — a deliberate divergence (ArrowDown / trigger button enter the grid).
- **Deferred alignments**: Duet's touch gestures and modified mobile interface map to our explicit "swipe gestures" deferral.

Resolved without further work: popover flipping near an edge is handled by `@lekoala/floating`, so no `direction`-style prop is needed; the open-popover `Tab` contract is decide-and-document only (see above), not code.
