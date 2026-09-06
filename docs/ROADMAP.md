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

- run TypeScript 7/Biome/Bun checks in the actual repo;
- run Playwright on all engines;
- manual AT test pass;
- add a real `@lekoala/calendar` mini-calendar integration demo;
- validate Popover behavior inside `<dialog>` and nested app surfaces;
- test form reset, disabled toggles and dynamic name/form ownership;
- decide exact event naming (`dateactivate` vs namespaced alternatives);
- decide whether `selection="none"` is the final public spelling;
- decide public styling tokens/class names;
- add custom-elements manifest once names stabilize;
- add package/generated-artifact checks like `@lekoala/combobox`;
- commit `bun.lock` and freeze installs in CI.

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
