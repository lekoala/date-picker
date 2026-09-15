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

The month control is a native select and the year control is a native number input. They are easy to discover, keyboard-operable, and do not require nested custom popovers.

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

While the popover is open, `Tab` is **not** trapped: focus leaves the popover to the next focusable element in the page. The popup is non-modal (`aria-modal` absent, the rest of the page stays interactive), so capturing the focus the way a modal dialog does would be incoherent — `Escape` remains the predictable way to close and return focus to the field. This deliberately diverges from Duet Date Picker's internal Tab wrap-around.

Decision for 0.1: the popup stays **non-modal** on every surface, including small/touch screens. A modal variant would need a separate design (focus trap, inert background, explicit close) and a proposal of its own.

## Validation

A typed invalid date uses `setCustomValidity()` on the visible input. A parsed but unavailable date uses a distinct message.

The same resolved date state used by the grid is used for manual-entry validation.

## Forced colors guard (selected day)

Forced colors should not rely on the normal selected-day fill tokens.

When `forced-colors: active`, the selected day and range endpoints switch to a border-based treatment:

- `Canvas` background;
- `CanvasText` foreground;
- `2px Highlight` outer border;
- in-range days keep a `1px Highlight` underline (the range fill is lost and the browser does not know the semantics).

Today keeps a thin `1px Highlight` border while selected carries the wider border, so the two stay distinct through border width. The disabled state relies on the native dimming, verified by capture. The month select hands its caret back to the browser (`appearance: auto`), since the author-drawn gradient is a non-system color.

Guard: re-run the `color-contrast` review and the forced-colors screenshot bundle whenever `--dp-*` styling or day-cell rendering changes.

## Visible focus

The default focus language uses `--dp-accent`, so the picker holds together without a consumer stylesheet (`outline: none` plus an accent border and a light halo). Only the focus state is normalized: the resting input appearance stays consumer-owned.

Focus is only ever drawn on a real box. The calendar trigger is a real button painted inside the date field's own box, so the field's focus ring naturally wraps the affordance too — no host-level ring, no pseudo-element. When the trigger itself is focused it shows a small inner ring, like the native `input[type=time]` indicator, instead of pretending the whole field is focused.

Day cells use an **inner** ring too: keyboard focus stays inside the 44px cell instead of reading as a second selected state, and it never bleeds onto a neighbouring range band. The ring is an `outline` with `outline-offset: -2px`, not an inset `box-shadow`, because forced colors computes `box-shadow` to `none` — an inset shadow would erase the keyboard indicator (including on disabled days, which must stay discoverable). `outline-color` is force-adjusted to a system color there, so the ring survives high contrast. On a cell already filled with the accent (selected, range endpoints) the ring inverts to `--dp-accent-fg` so it stays readable.

Each native time companion is an independent control and keeps its own ring; they are not joined, so rings never merge and no neighbour swallows another's focus. In `[range]`, each bound owns its trigger and its own ring, and focus follows the active bound rather than the original trigger.

Closing returns focus to the control that opened the popover (field or trigger) in single mode.

## Recommended manual test matrix

Beyond what the automated suite covers, the following pairings should be exercised before a broad adoption of 0.1. Results are recorded in [AT-CHECKLIST.md](AT-CHECKLIST.md); the human rows there are still open:

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
