/** @typedef {{ month: string, year: string, nav: string }} ControlClasses */

/**
 * Normalize author class tokens. The dp-* namespace belongs to the component.
 * @param {unknown} value
 */
export function normalizeControlClass(value) {
  if (typeof value !== "string") return "";
  return [
    ...new Set(
      value
        .split(/\s+/)
        .filter(
          (token) =>
            token &&
            !token.startsWith("dp-") &&
            ![...token].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127),
        ),
    ),
  ].join(" ");
}

/** @param {ControlClasses} a @param {ControlClasses} b */
export function sameControlClasses(a, b) {
  return a.month === b.month && a.year === b.year && a.nav === b.nav;
}

/** @type {ControlClasses} */
let defaults = { month: "", year: "", nav: "" };

export function getDefaultControlClasses() {
  return { ...defaults };
}

/**
 * Preserve omitted roles so they can inherit defaults when rendered.
 * @param {Partial<ControlClasses> | null} classes
 * @returns {Partial<ControlClasses> | null}
 */
export function normalizeControlClasses(classes) {
  if (classes == null) return null;
  /** @type {Partial<ControlClasses>} */
  const result = {};
  for (const role of /** @type {const} */ (["month", "year", "nav"])) {
    if (Object.hasOwn(classes, role)) result[role] = normalizeControlClass(classes[role]);
  }
  return result;
}

/** @param {Partial<ControlClasses> | null} classes */
export function usesDefaultControlClasses(classes) {
  return classes == null || ["month", "year", "nav"].some((role) => !Object.hasOwn(classes, role));
}

/** @param {Partial<ControlClasses> | null} classes */
export function resolveControlClasses(classes) {
  return { ...getDefaultControlClasses(), ...normalizeControlClasses(classes) };
}

/**
 * Set defaults and refresh connected elements with inherited control roles.
 * @param {Partial<ControlClasses>} classes
 */
export function setDefaultControlClasses(classes) {
  const next = resolveControlClasses(classes);
  if (sameControlClasses(defaults, next)) return;
  defaults = next;
  for (const listener of listeners) listener();
}

/** @type {Set<() => void>} */
const listeners = new Set();

/** @param {() => void} listener */
export function subscribeDefaultControlClasses(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
