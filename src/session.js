/**
 * One lifetime: a picker connection, a calendar connection or a field
 * controller. The returned controller is the token an operation captures
 * before it suspends.
 * @returns {AbortController}
 */
export function createSession() {
  return new AbortController();
}

/**
 * Protect a callback with the signal captured now. The caller keeps the
 * scheduling choice (`queueMicrotask` vs `setTimeout`), because focus behavior
 * in Chromium depends on it.
 * @param {AbortSignal} signal
 * @param {() => void} callback
 * @returns {() => void}
 */
export function guard(signal, callback) {
  return () => {
    if (!signal.aborted) callback();
  };
}
