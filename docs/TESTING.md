# Testing

## Fast loop

```bash
bun run test:syntax
bun run typecheck
bun run test
```

Pure date math, locale parsing and model transitions belong in `test/unit` and must remain DOM-free.

## Browser loop

```bash
bun run test:browser
```

Chromium covers the fast interaction loop. Before release:

```bash
bun run test:browser:all
```

runs Chromium, Firefox and WebKit.

## What belongs in browser tests

Browser tests should cover behavior that cannot be trusted to a DOM shim:

- Popover open/close;
- focus movement and roving tabindex;
- real keyboard events;
- month/year selects;
- form submission shape;
- floating placement staying in the viewport;
- outside pointer close;
- source cancellation;
- range validation;
- forced-colors/zoom smoke cases.

## Core invariants

Keep explicit tests for these regressions:

1. `value`, `display` and `focusedDate` are independent.
2. Month/year navigation never selects.
3. Arrow navigation never selects.
4. `dateactivate` is the only user activation seam.
5. `selection="none"` never mutates `value`.
6. `getMonthWeeks()` never pads.
7. `fixed-weeks` renders 42 day cells.
8. Outside-month cells can activate.
9. Source navigation aborts stale loads.
10. Typed and clicked dates resolve the same disabled state.
11. Start/end linkage never silently changes sibling values.
12. Exactly one grid cell has `tabindex="0"`.

## CI

The included workflow uses Bun 1.4.2 and runs static checks/unit tests before Playwright.

`bun.lock` is committed. Keep installs frozen in CI (`bun install --frozen-lockfile`) so dependency resolution stays deterministic. Regenerate the lock with `bun install` when the manifest changes and commit it in the same change.
