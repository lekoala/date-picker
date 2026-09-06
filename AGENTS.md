# AGENTS.md

This repo is a small date-selection primitive. Keep it small.

## Product boundary

A plain editable date field remains preferable for simple forms. This package is for constrained/contextual date choice and reusable inline calendars.

It does **not** become a scheduler.

## Non-negotiable model

Never merge these concepts:

- `display`: month being shown;
- `focusedDate`: keyboard target;
- `dateactivate`: explicit user activation;
- `value`: selected date.

Changing month/year or moving keyboard focus must not select a date.

`selection="none"` is the mini-calendar/navigation contract: activation is exposed to the consumer and `value` is untouched.

## Canonical values

Public date values are `YYYY-MM-DD`. Public month values are `YYYY-MM`.

Do not introduce timestamps, UTC strings, timezone-bearing types or `Date` objects as canonical public values.

Do not add a Temporal dependency without an explicit compatibility decision.

## Layering

Keep pure logic out of custom element classes:

- `date.js` — civil math;
- `intl.js` — formatting/parsing;
- `calendar-model.js` — state transitions;
- `source.js` — source normalization/fetch adapter;
- `date-range.js` — cross-picker relationship;
- `date-calendar.js` — DOM/grid interaction;
- `date-picker.js` — input/popup composition.

If a custom-element class grows because of a pure rule, extract the rule rather than adding another branch.

## Accessibility

Accessibility changes are behavior changes.

Preserve:

- semantic `table[role=grid]`;
- one roving tabbable grid cell;
- `aria-selected` for selection;
- `aria-current=date` for today;
- full weekday names through `abbr`;
- arrow/Home/End/PageUp/PageDown keyboard contract;
- no implicit selection on focus movement;
- disabled dates remain discoverable by grid navigation;
- no `aria-modal=true` unless the implementation is actually modal.

Do not allow custom rendering to replace grid cells.

## Async state

All supersedable source work must accept/use `AbortSignal`. A stale source response must never repaint the active month.

The source shape is data-oriented. Do not hard-code application URL/query conventions into the element.

## Range

Start/end coupling stays external. Do not add sibling selectors or `rangeStart/rangeEnd` branches inside `DatePickerElement`.

## Tooling

Use the pinned repo tools:

```bash
bun run test:syntax
bun run lint
bun run typecheck
bun run test
bun run test:browser
bun run build
```

Source remains JavaScript with JSDoc + TypeScript `checkJs`, matching `@lekoala/combobox`.

## Before expanding scope

A feature should clearly serve at least one documented use case in `docs/USE_CASES.md`. Otherwise write the use case first or keep it application-owned.

## Reusable debug probes

Interaction quirks (focus/popover/click re-entrancy, engine differences) are proven with small scripts, not with throwaway inline code that stays in the session.

Keep reusable probes in `scripts/helpers/`:

```bash
bun scripts/helpers/probe.mjs /test/fixtures/focus.html "document.getElementById('focus-picker').value"
```

Probe prints the expression result, `document.activeElement`, every `[popover]` open state, plus console/page errors. `scripts/helpers/server.js` starts the static server on a free port for manual checks. `PROBE_HEADED=1` opens a visible window.

When a probe proves a behavior, either turn it into a browser spec or delete it — probes never ship. Verify an engine-quirk fix on all engines before committing.
