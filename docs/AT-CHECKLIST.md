# Manual accessibility test pass

Automated Playwright covers interaction invariants; this checklist now distinguishes what the repo can re-check from what only a human with a real screen reader, keyboard or visual review can confirm. Run the manual parts once before `0.1.0` and record the result below.

## Legend

- `[auto]`: can be verified in-repo with Playwright and DOM assertions.
- `[manual]`: requires a human AT or visual pass.
- `[split]`: behavior can be checked automatically here, but announcement or perception still needs a human pass. Leave these unchecked until the manual portion is done.

## Setup

- Engines: Chrome/Narrator (Windows), Firefox/NVDA, macOS/VoiceOver at least once.
- Contrast: run `color-contrast` review in DevTools on the demo plus a forced-colors spot check.
- Page under test: `demo/index.html` (uses `fr-BE` labels) and `test/fixtures/form-state.html`.

## Keyboard only

- [x] [auto] Tab reaches the input, the popup button and the month/year selects as native controls.
- [x] [auto] Inside an open popup, Tab enters the grid on exactly one `tabindex="0"` cell.
- [x] [auto] Arrow keys move by day, ArrowUp/ArrowDown by week; no date is selected while moving.
- [x] [auto] Home/End move to the first/last cell of the week.
- [x] [auto] PageUp/PageDown move month; Shift+PageUp/PageDown move year; focus follows across a month boundary.
- [x] [auto] Enter/Space activates and, in `selection="single"`, selects.
- [ ] [split] Disabled days stay focusable via arrow keys but never select; reason is announced (behavior covered automatically; announcement still manual).
- [x] [auto] Escape in the picker closes the popup and restores focus to the input; in a `<dialog>`, the second Escape closes the dialog.
- [x] [split] Month/year selects and prev/next buttons work without a pointer (control behavior covered automatically; manual keyboard/AT pass still open).
- [x] [manual] Links/callback-seam cases (U8): all demo cards operate without a pointing device.

## Screen reader

- [ ] [manual] The grid is announced as a table with full weekday names (`abbr` expands).
- [ ] [split] `aria-current="date"` marks today; `aria-selected` marks the selection (attributes present in DOM; announcement still manual).
- [ ] [split] Each cell's accessible name includes the full date and, when present, the `description` (ARIA label content is present in DOM; announcement still manual).
- [ ] [manual] Disabled cells announce "unavailable" distinctly.
- [ ] [split] The picker input announces its role (combobox), the popup trigger, and the format hint (attributes wired in DOM; announcement still manual).
- [ ] [split] The popup announces as a dialog with a label, and `aria-modal` stays absent (role/label/absence are wired in DOM; announcement still manual).
- [ ] [manual] The mini calendar + `calendar-view` demo announces both parts; activating a day announces the agenda navigation.
- [ ] [manual] Month/year navigation and source loading announcements are not clipped or repeated twice.

## Form & lifecycle

- [x] [auto] Typing a valid localized date updates the field validation state (no stale invalid message).
- [x] [split] Typing an impossible date produces an announced invalid message (native invalid state/message covered automatically; announcement still manual).
- [x] [manual] Forced-colors mode keeps selected/today/disabled distinguishable — including a selected day when `Highlight` resolves near-white (no white-on-white from `--dp-accent`; spot-checked with the forced-colors screenshot bundle).

## Automated pass

- Date: 2026-09-06.
- Engines: Chromium, Firefox, WebKit.
- Browser command run: `bun run test:browser:accessibility`.
- Result: 124 browser tests passed and 2 were skipped across the configured desktop projects; the forced-colors style assertion is Chromium-only.
- Forced-colors spot check: `bun run shot:forced-colors:important` reviewed manually after the selected-day forced-colors fix.

## Record

Run once per supported screen reader pairing, then add the date, the pair (OS + reader + browser), and any failures as issues.

| Date | OS / reader / browser | Result | Regression issues |
| --- | --- | --- | --- |
|  |  | ✅ / ❌ |  |
