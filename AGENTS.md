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

## Manual entry

Typed text is a draft, not a value: only a commit (`blur`/`change`/`validate()`) changes the canonical date, and the hidden ISO is cleared as soon as the draft differs.

- An invalid committed draft keeps its text, reports native validity, sets `aria-invalid` and never restores the previous value.
- A complete draft is the existing parser's business. The entry mask only re-renders drafts it could itself have produced; never redistribute a partial draft that carries explicit separators.
- Separators, order and digits come from `Intl`. Never guess the component order and never accept a two-digit year.
- The entry mask is a projection, not a second parser and not a strict character filter.
- The visible field is bounded to one complete locale value (`maxlength`), so an unparsable draft never grows without limit.
- Do not add an external mask to a picker input: two writers on one value have no defined caret behavior.

## Layering

Keep pure logic out of custom element classes:

- `date.js` — civil math;
- `intl.js` — formatting/parsing;
- `date-mask.js` — locale entry mask (pure digit/caret projection);
- `calendar-model.js` — state transitions;
- `source.js` — source normalization/fetch adapter;
- `date-range.js` — cross-picker relationship + range state machine;
- `date-field.js` — single editable field ownership (input, hidden ISO, text commit);
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

## State authority and lifecycle

The authoritative state per mode, the supported mutations, the session rule and the reconnect contract live in `docs/ARCHITECTURE.md` §11. Read it before touching sync, async or teardown code. The invariants:

- Name the authority before touching sync code. Derived state is recomputed from it, never merged back into it (§11.5).
- Structure is fixed at connect. Native form state (`name`, `form`, `disabled`, `readonly`, fieldset, reset, `defaultValue`) is followed because it is the browser contract. Everything else is public API or unsupported (§11.3).
- Every suspension checks the session captured when the operation started, never the current one (§11.1).
- An application-provided initial value is not a component-generated default (`DateFieldController.adoptDefault()`).
- Disconnect is teardown; reconnect is a new session built from the live DOM (§11.4).

## Async state

All supersedable source work must accept/use `AbortSignal`. A stale source response must never repaint the active month.

The source shape is data-oriented. Do not hard-code application URL/query conventions into the element.

An older intent must never win over a newer one:

- Track pending user intents by an activation identity, not by a value that can repeat (the same date activated twice is two intents).
- After any `await`, check the session captured before it, the intent generation, and current editability before committing (`ARCHITECTURE.md` §11.1–11.2).
- A superseded operation emits no commit event (`change`, `input`, range events).

Reusable scenario for specs:

```text
Given operation A awaits an async response
When  operation B changes the same state
And   B settles before A
Then  A cannot overwrite B
And   no stale commit event is emitted
```

## Audits

A finding is actionable only if it shows all four:

1. the invariant it violates, named from this file or `docs/ARCHITECTURE.md`;
2. a reproducible scenario reachable through a documented interaction, public API/attributes, or native form semantics;
3. a concrete impact (wrong value, stale event, broken submission, accessibility loss);
4. a test that fails before the fix.

An architecture preference is not a bug. An audit that finds no actionable defect is a valid result: do not invent findings to fill a report. Unsupported mutation combinations are answered by "disconnect and reconnect", not by a new guard.

## Browser contract

Respect effective native state, not the raw property:

- Use `matches(":disabled")` for editability; `input.disabled` misses a disabled ancestor `fieldset`.
- `readonly`, form reset, `defaultValue`, form submission shape and native fallback behave as the browser would without the component.
- Engine quirks are verified on Chromium, Firefox and WebKit.

## Range

Two product shapes cover the range cases:

- `date-picker[range]` with `[data-range-start]`/`[data-range-end]` inputs shares ONE calendar surface. Each input is wrapped by a `DateFieldController` and the pair is driven by the `DateRangeController` in `date-range.js`. `DatePickerElement` stays a shell: range rules live in the controllers, not as `rangeStart`/`rangeEnd` branches in the class. `value` stays undefined/throws in range mode; `range` is the atomic API and the calendar shows only a displayable (ordered) range via `highlightedRange`.
- `linkDateRange(start, end)` keeps the external relationship for two independent pickers (U5).

## Language

Docs and code comments are written in English. Demo content is English too, except where a card deliberately demonstrates another language (the Korean locale card). User-facing localized strings stay in the language they demonstrate.

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

No need to lint before formatting - you can always apply formatting, this saves one call.
Source remains JavaScript with JSDoc + TypeScript `checkJs`, matching `@lekoala/combobox`.

## Distribution

A test passing on `src/` does not validate what ships. Source, bundles, standalone build, types and minified CSS must expose the same contract (`bun run test:dist`).

`build.js` minifies CSS with regexes that do not understand strings or `url()`. If the CSS gains quoted `content`, URLs or comments inside strings, add a fixture or switch to a grammar-aware minifier.

Release rule: `prepublishOnly` only runs `verify`. Publish only after `bun run check:all` (all browser engines + dist) passes locally or in CI.

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
- `range-band.png` — highlighted range band with start, in-range and end cells.

Use `bun run shot:forced-colors:important:dark` for the same bundle under `forced-colors: active` plus `prefers-color-scheme: dark`. It writes to `tmp/forced-colors-important-dark/`.

Run `bun run shot:forced-colors -- --list-scenarios` to list the built-in presets.

Workflow: reproduce with the probe or forced-colors shot → fix → re-probe/re-capture → promote the proven behavior into a browser spec or checklist note, or delete the one-off artifact. Probes never ship. Verify an engine-quirk fix on all engines before committing.
