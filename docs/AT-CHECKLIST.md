# Manual accessibility test pass

Automated Playwright covers interaction invariants; this checklist covers what only a human with a real screen reader and keyboard can confirm. Run it once before `0.1.0` and record the result below.

## Setup

- Engines: Chrome/Narrator (Windows), Firefox/NVDA, macOS/VoiceOver at least once.
- Contrast: run `color-contrast` review in DevTools on the demo plus a forced-colors spot check.
- Page under test: `demo/index.html` (uses `fr-BE` labels) and `test/fixtures/form-state.html`.

## Keyboard only

- [ ] Tab reaches the input, the popup button and the month/year selects as native controls.
- [ ] Inside an open popup, Tab enters the grid on exactly one `tabindex="0"` cell.
- [ ] Arrow keys move by day, ArrowUp/ArrowDown by week; no date is selected while moving.
- [ ] Home/End move to the first/last cell of the week.
- [ ] PageUp/PageDown move month; Shift+PageUp/PageDown move year; focus follows across a month boundary.
- [ ] Enter/Space activates and, in `selection="single"`, selects.
- [ ] Disabled days stay focusable via arrow keys but never select; reason is announced (see below).
- [ ] Escape in the picker closes the popup and restores focus to the input; in a `<dialog>`, the second Escape closes the dialog.
- [ ] Month/year selects and prev/next buttons work without a pointer.
- [ ] Links/callback-seam cases (U8): all demo cards operate without a pointing device.

## Screen reader

- [ ] The grid is announced as a table with full weekday names (`abbr` expands).
- [ ] `aria-current="date"` marks today; `aria-selected` marks the selection.
- [ ] Each cell's accessible name includes the full date and, when present, the `description`.
- [ ] Disabled cells announce "unavailable" distinctly.
- [ ] The picker input announces its role (combobox), the popup trigger, and the format hint.
- [ ] The popup announces as a dialog with a label, and `aria-modal` stays absent.
- [ ] The mini calendar + `calendar-view` demo announces both parts; activating a day announces the agenda navigation.
- [ ] Month/year navigation and source loading announcements are not clipped or repeated twice.

## Form & lifecycle

- [ ] Typing a valid localized date updates the field validation state (no stale invalid message).
- [ ] Typing an impossible date produces an announced invalid message.
- [ ] Forced-colors mode keeps selected/today/disabled distinguishable.

## Record

Run once per supported screen reader pairing, then add the date, the pair (OS + reader + browser), and any failures as issues.

| Date | OS / reader / browser | Result | Regression issues |
| --- | --- | --- | --- |
|  |  | ✅ / ❌ |  |