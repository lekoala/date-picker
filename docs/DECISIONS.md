# Decisions

Frozen contracts for the public surface. A change to a decision below is a breaking change and needs a proposal, not an opportunistic edit.

## D1 — Calendar events are flat, verb-named

Never merged with the `value` concept (`dateactivate` is activation, not `value`).

- `date-calendar`: `dateactivate`, `datefocus`, `datechange`, `dateinvalid`, `displaychange`, `dateloadstart`, `dateloadend`, `dateloaderror`.
- `date-picker`: `valuechange`, `open`, `close`, plus `rangechange` in range mode.

The observation verbs stay distinct: `datefocus` observes navigation, `dateactivate` requests an activation (and is cancelable), `datechange` observes a selection. `datefocus` is named after the user event rather than after the `focusedDate` setter, so a programmatic assignment that moves no DOM focus never announces one.

No `dp:` namespace prefix on element events, even though `@lekoala/combobox` namespaces its events (`combobox:*`).

Rationale: the flat names describe a distinct concept (`dateactivate`), never collide with native input events, and are already wired through the docs, demos and tests. A namespace is not worth the churn for this package.

## D2 — `selection="none"` is the final spelling

The navigation-only calendar keeps `selection="none"`.

`selection` remains a value attribute (`single` | `none`); it is how the mini calendar speaks the navigation contract: accepted activation dispatches `dateactivate`, `value` is untouched.

## D3 — CSS: `--dp-*` is public, `.dp-*` is not

> `--dp-*` is the public styling namespace. `.dp-*` identifies component-owned DOM but is not a public styling API unless explicitly documented.

- The namespace prefix is `dp`, final. There are no `--lko-dp-*` or `.lko-dp-*` classes. A shared `--lko-*` token space is reserved for tokens actually shared between LeKoala packages, not as a per-component prefix.
- The `--dp-*` custom properties (background, foreground, accent, border, radius, day-size, gap, …) are the **public customization surface**. They are listed in `custom-elements.json` and are stable.
- Every `.dp-*` class is **internal DOM** and may change, move or disappear without a semver bump. This includes `.dp-day`, `.dp-grid`, `.dp-picker-panel` and the day-extra container.
- `renderDay()` is a public extension seam, but the name of the container its output is placed into is **not** promised. Consumers style their own returned nodes and assign their own class names.
- Demos, tests and internal code may reference `.dp-*` classes; their use there does not turn those classes into public API.

Context: DOM-backed styling hooks become API the moment they are documented — every internal rename then breaks consumers. We prefer to expose hooks (`--dp-*`, `renderDay()`, events) and keep the rendered anatomy free to evolve.

## D4 — `<date-picker>` opens on focus; `open` is read-only

- The picker opens its popover when the input receives focus (`open-on-focus`, default `true`; set `open-on-focus="false"` to opt out).
- Opening on focus **never steals keyboard focus**: the user can start typing immediately. The grid takes focus only on ArrowDown, on the calendar trigger, or after the user moves the pointer into the popup.
- Closing returns focus to the control that opened the popover (field or trigger) — the usual popover convention. Range mode is the exception: focus follows the active bound, because a first pick moves the workflow to the other bound.
- The calendar trigger is overlaid inside the field's own box, like the native `input[type=time]` indicator. The field reserves its place (`padding-inline-end`), keeps its border/background, and owns the focus ring for the pair; the trigger is a real button with an inner ring of its own. A range bound owns its own trigger; the two share one popup, calendar, source and state.
- `show()` / `hide()` are the control surface. `open` is a **read-only getter** reflecting the popover. There is no `open` attribute: the popover element is the single machine of truth and a second state machine would only drift.
- `readonly` mirrors native semantics: the field is non-editable, the value is still submitted, and the picker cannot change it — the calendar trigger is disabled. `disabled` additionally unsubmits the field. `readonly` is never used to mean "no typing, but calendar selection allowed".
- Clearing the editable input clears the canonical value (the component renders no internal clear button). Form resets follow the native `defaultValue` contract. This matches the Open UI datepicker `clear` concept: clearing is a text-editing action, not a component-owned affordance.

## D5 — Time is a native companion, not picker state

- Time fields are authored native `input[type=time]` marked `[data-time-start]` / `[data-time-end]`; `name`, `value`, `required`, `min`, `max`, `step` and submission stay native. There is no hidden time input and no time field controller.
- `picker.value` / `picker.range` remain date-only (`YYYY-MM-DD`); the picker never constructs a datetime, a timestamp or a timezone-bearing value.
- The picker only coordinates from/to order (`start <= end`, equality allowed); duration rules stay application-owned.
- Custom time UI and slot picking stay outside the package.

## D6 — Calendar interaction never produces an inverted range

Pointing and typing are different contracts, deliberately.

- **Interaction** (click, keyboard) always yields an ordered range. While a range is being created, the second selection is sorted against the anchor: `10` then `5` commits `5 -> 10`, and `10` then `10` a one-day range. No `dateinvalid` is fired merely because the second point is earlier.
- **Text entry** may be temporarily inverted. Typing `start` past `end` keeps both values and reports `rangeOrderStart` / `rangeOrderEnd` on the modified bound, because a half-typed pair is a normal editing state.
- An explicit change to **one bound of an already complete pair** keeps that bound's identity: moving `end` before `start` is refused rather than silently rewriting the other field.
- Because one interaction can move both bounds at once, a transition describes the whole resulting pair (`{ status, endpoint, changedEndpoints, range, activeEndpoint }`) and is applied in a single write: one `rangechange`, with synthetic `input` / `change` only on the bounds that actually moved.
- Hover and keyboard focus read the **same projection** (`previewRange()`) that the commit applies, so what the band promises is what the next selection commits. A preview writes nothing: no `rangechange`, no field write, no validation, no source request.
- Click and keyboard end in that one range machine and in the same `ensureDate` plus cancelable `dateactivate` path, so an application veto cannot be bypassed by choosing another input device.

## D7 — Author classes own header control styling

`controlClasses` and `setDefaultControlClasses()` are the public hooks for styling the month, year and navigation roles with a host design system. A role with non-empty author classes receives no library skin, including in forced colors. Layout remains component-owned. Roles without author classes retain the default skin.

The `.dp-*` namespace stays internal (D3); it is reserved and ignored in author class lists. Day grid cells and the picker trigger are outside this API. There is no HTML attribute.

## D8 — Defaults are accessible through registered constructors

Both element classes expose static `setDefaultControlClasses`, `getDefaultControlClasses`, `setDefaultMessages` and `getDefaultMessages` methods delegating to the existing module functions. This additive API makes defaults available in classic builds through `customElements.get()` without introducing a global. The constructors share one defaults state within a build. Instances without overrides resolve current defaults when used, and connected instances refresh when defaults change. Disconnected instances unsubscribe and read current defaults on reconnection. For `controlClasses`, an assignment stores only the normalized roles provided: omitted roles follow current global defaults at read/render time, an explicit empty string restores the library skin for that role, and `null` follows all defaults. Global class changes also refresh instances with partial overrides. Message assignments merge with current defaults and pin that instance setting; `null` resumes following global message defaults. Pickers forward only their own overrides to their calendar, preserving global inheritance.

Writable public properties assigned before element definition are replayed through their setters on connection. Options are applied before building controls; picker `value` and `range` wait for the fields and range controller. The display, focus, activation and selection contracts remain distinct.

## D9 — Endpoint dragging is an application interaction

`<date-picker range>` owns the range workflow: which bound a pick targets, sorting, atomic pair writes, validation and events. It does **not** implement pointer dragging of the two endpoints.

- A pointer gesture that moves a bound is a second interaction machine (pointer capture, travel threshold, `pointercancel`, `lostpointercapture`, trailing-click suppression, a per-gesture endpoint identity). It is not rejected as a feature; it sits at a different abstraction level from range semantics. The picker owns the range rules, not the pointer gesture.
- The application writes the public API, not internal state: `calendar.activateDate(date)` for availability plus the cancelable `dateactivate` veto, then `picker.range = { start, end }`, then native `input`/`change` on the bound it moved. `dates.compareDates` stays public for the clamp against the opposite bound.
- The calendar keeps the seams this requires: `datefocus`, `highlightedRange`, `data-range-preview` (a proposal is never announced as a range start/end), `activateDate()`, and the stable day-cell markers `data-date` / `data-range-start` / `data-range-end`.
- Moving a bound is an availability-checked action, never a silent rewrite: a refused or vetoed activation leaves the range untouched.
- A tested **starting point** ships in `docs/CALENDAR-INTEGRATION.md` and is covered by `test/browser/app-owned-drag.spec.js`. It implements the travel threshold, supersedes stale gestures, abandons a gesture on `pointercancel`/`lostpointercapture`, and refuses to apply after a concurrent `picker.range` change. It is not a feature-equivalent replacement: touch handling, a cursor affordance, the discard of a draft typed in the other bound, and a mid-flight endpoint switch stay application-owned.
- The existence of that recipe is not a reason to re-add an integrated drag. A separate optional `range-drag` module is not introduced before a real consumer demonstrates the need.

Dragging is not replaced by an opt-in attribute. Either the application implements it, or the picker does not offer it.

## D10 — Range preview stays picker-owned

The 0.6 scope review considered removing the hover/keyboard range preview together with endpoint dragging. Measured on the post-drag code, it does not meet the removal criteria:

- one transient field (`_previewDate`), ~60 lines in the picker, a 20-line pure projection (`previewRange()`), three listeners and two CSS rules;
- no lifecycle guard beyond `_open` and the current range;
- synchronous (no `await`), so the transition harness covers it without a new async case.

It also carries a real UX contract: the band shows what the next pick will commit, and a proposal is never announced as a committed selection (`data-range-preview`). Removing it would either lose that contract or force every application to reimplement it.

The drag failed these criteria: pointer capture, cancellation, trailing click, endpoint identity and a cursor affordance were its own machine. The two features are therefore not a pair — drag is application-owned (D9), preview stays here.

Revisit only if a real consumer needs a picker without preview. The answer would then be an explicit opt-out, not a silent removal.
