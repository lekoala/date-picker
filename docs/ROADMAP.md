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
