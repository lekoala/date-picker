/**
 * Package-internal: the host intent each activation event carries. A host
 * (`date-picker`) hands its intent to the next activation through
 * `_hostIntent`; `activateDate()` takes it synchronously and tags the events
 * it dispatches, so a late response is matched to its own interaction, never
 * to an earlier or later activation of the same date.
 * @type {WeakMap<Event, unknown>}
 */
export const activationIntents = new WeakMap();
