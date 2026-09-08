# Decisions

Frozen contracts for the `0.1.0` surface. A change to a decision below is a breaking change and needs a proposal, not an opportunistic edit.

## D1 — Calendar events are flat, verb-named

Never merged with the `value` concept (`dateactivate` is activation, not `value`).

- `date-calendar`: `dateactivate`, `datechange`, `dateinvalid`, `displaychange`, `dateloadstart`, `dateloadend`, `dateloaderror`.
- `date-picker`: `valuechange`, `open`, `close`.

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
- `show()` / `hide()` are the control surface. `open` is a **read-only getter** reflecting the popover. There is no `open` attribute: the popover element is the single machine of truth and a second state machine would only drift.
- `readonly` mirrors native semantics: the field is non-editable, the value is still submitted, and the picker cannot change it — the calendar trigger is disabled. `disabled` additionally unsubmits the field. `readonly` is never used to mean "no typing, but calendar selection allowed".
- Clearing the editable input clears the canonical value (the component renders no internal clear button). Form resets follow the native `defaultValue` contract. This matches the Open UI datepicker `clear` concept: clearing is a text-editing action, not a component-owned affordance.

## D5 — Time is a native companion, not picker state

- Time fields are authored native `input[type=time]` marked `[data-time-start]` / `[data-time-end]`; `name`, `value`, `required`, `min`, `max`, `step` and submission stay native. There is no hidden time input and no time field controller.
- `picker.value` / `picker.range` remain date-only (`YYYY-MM-DD`); the picker never constructs a datetime, a timestamp or a timezone-bearing value.
- The picker only coordinates from/to order (`start <= end`, equality allowed); duration rules stay application-owned.
- Custom time UI and slot picking stay outside the package.