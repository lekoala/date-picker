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

## Language

Docs and code comments are written in English. Demo content and user-facing localized strings stay in their display language.

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

Keep reusable probes in `scripts/helpers/` and **use them whenever a quirk needs a quick repro before writing a spec**:

```bash
# state snapshot on load
bun scripts/helpers/probe.mjs /test/fixtures/focus.html "document.getElementById('focus-date').value"

# multi-step interaction: the expression may be async and awaited
bun scripts/helpers/probe.mjs /test/fixtures/focus.html "(async () => {
  document.getElementById('focus-date').focus();
  await new Promise(r => setTimeout(r, 100));
  document.querySelector('#focus-picker .dp-day').click();
  await new Promise(r => setTimeout(r, 50));
  return document.getElementById('focus-picker').value;
})()"
```

The probe prints the expression result, `document.activeElement`, every `[popover]` open state, and console/page errors. It starts its own static server on a free port, so it never collides with a running Playwright run. `scripts/helpers/server.js` exports `startServer()`/`freePort()` for ad-hoc scripts that need more than one step. Set `PROBE_HEADED=1` for a visible window.

For forced-colors and high-contrast visual checks, capture reproducible screenshots instead of relying on an ad-hoc browser session:

```bash
# full demo page in forced colors
bun run shot:forced-colors -- /demo/index.html --out tmp/forced-colors-demo.png

# built-in important states bundle
bun run shot:forced-colors:important

# same bundle with prefers-color-scheme: dark
bun run shot:forced-colors:important:dark

# constrained calendar only
bun run shot:forced-colors -- /demo/index.html --selector "#constrained" --out tmp/forced-colors-constrained.png

# picker card with the popup open before capture
bun run shot:forced-colors -- /demo/index.html --selector "section.card:nth-of-type(2)" --setup "(async () => { document.querySelector('#simple-picker .dp-picker-button').click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return true; })()" --out tmp/forced-colors-picker-open.png
```

`scripts/forced-colors-shot.js` starts its own static server, emulates `forced-colors: active` plus the requested color scheme, optionally runs a setup expression in the page, then saves either a full-page shot or an element shot. It accepts a root-relative path, a repo path or an absolute URL. It uses Chromium, matching the DevTools forced-colors pipeline. Set `PROBE_HEADED=1` for a visible window.

Use `--scenario important` when you want one command that covers the main forced-colors regressions in this repo. It writes a small bundle to `tmp/forced-colors-important/`:

- `overview.png` — full demo overview.
- `inline-states.png` — inline calendar with selected day and today visible together.
- `constrained-disabled.png` — constrained calendar with disabled-day styling.
- `constrained-disabled-focus.png` — the disabled day with keyboard focus.
- `picker-open.png` — the picker card with the popup open.

Use `bun run shot:forced-colors:important:dark` for the same bundle under `forced-colors: active` plus `prefers-color-scheme: dark`. It writes to `tmp/forced-colors-important-dark/`.

Run `bun run shot:forced-colors -- --list-scenarios` to list the built-in presets.

Workflow: reproduce with the probe or forced-colors shot → fix → re-probe/re-capture → promote the proven behavior into a browser spec or checklist note, or delete the one-off artifact. Probes never ship. Verify an engine-quirk fix on all engines before committing.
