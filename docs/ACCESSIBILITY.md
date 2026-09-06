# Accessibility

Accessibility is part of the component contract, not a polish milestone.

Reference patterns:

- WAI-ARIA APG Date Picker Dialog: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/
- WAI-ARIA APG Date Picker Combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-datepicker/
- Grid pattern: https://www.w3.org/WAI/ARIA/apg/patterns/grid/

APG examples are examples, not drop-in production code. This implementation should be tested with real browser/assistive-technology combinations before 0.1.

## Calendar grid

The calendar renders a semantic `<table role="grid">`.

Because the grid role is applied to a table, native `tr`, `th` and `td` elements provide row/column/gridcell semantics. Exactly one date cell has `tabindex="0"`; every other date cell has `tabindex="-1"`.

Selection is represented with `aria-selected="true"` on the selected cell. Today uses `aria-current="date"`.

A business-disabled date uses `aria-disabled="true"`, but remains focusable by arrow keys. This lets a user discover the date and hear its description instead of creating unexplained holes in keyboard navigation.

Weekday headings use visible short labels plus a full `abbr` value.

## Keyboard map

| Key | Calendar action |
| --- | --- |
| Left | previous day |
| Right | next day |
| Up | previous week |
| Down | next week |
| Home | first day of current week |
| End | last day of current week |
| PageUp | same/clamped day in previous month |
| PageDown | same/clamped day in next month |
| Shift+PageUp | same/clamped day in previous year |
| Shift+PageDown | same/clamped day in next year |
| Enter / Space | activate focused date |

Moving focus never changes selection.

## Month/year controls

The prototype deliberately uses native selects. They are easy to discover, keyboard-operable, and do not require nested custom popovers.

The year select is a moving window around the displayed year when no hard min/max exists. Navigating past the current window causes a normal re-render centered on the new year.

## Date picker input

The visible input remains a native text field. It owns:

- focus;
- label association;
- required state;
- browser validation UI;
- typed text.

The picker sets:

- `role="combobox"`;
- `aria-haspopup="dialog"`;
- `aria-expanded`;
- `aria-controls`;
- a format hint through `aria-describedby`.

The calendar button has its own accessible name and includes the selected long date when one exists.

## Popup semantics

The popup is a native manual Popover with `role="dialog"`.

It is not currently modal: the implementation does not inert the rest of the page and does not claim `aria-modal="true"`.

Open behavior:

- the selected date is focused if present;
- otherwise today is focused;
- ArrowDown on the input opens the popup;
- the calendar button opens the popup.

Close behavior:

- date activation commits and returns focus to the input;
- Escape closes;
- outside pointer activation closes.

Before 0.1 we should decide, based on AT testing, whether the popup should remain a non-modal dialog/combobox popup or move to a genuinely modal interaction on small/touch screens.

## Validation

A typed invalid date uses `setCustomValidity()` on the visible input. A parsed but unavailable date uses a distinct message.

The same resolved date state used by the grid is used for manual-entry validation.

## Required manual test matrix before 0.1

At minimum:

- Windows + Chrome + NVDA;
- Windows + Firefox + NVDA;
- macOS + Safari + VoiceOver;
- iOS Safari + VoiceOver;
- Android Chrome + TalkBack;
- 200% zoom/reflow;
- forced-colors/high contrast;
- keyboard only;
- French and English locale;
- RTL spike before claiming RTL support.
