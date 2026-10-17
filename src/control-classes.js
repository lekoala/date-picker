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
            !/["'<>`=]/.test(token) &&
            ![...token].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127),
        ),
    ),
  ].join(" ");
}

/** @type {ControlClasses} */
let defaults = { month: "", year: "", nav: "" };

export function getDefaultControlClasses() {
  return { ...defaults };
}

/** @param {Partial<ControlClasses> | null} classes */
export function resolveControlClasses(classes) {
  const result = getDefaultControlClasses();
  for (const role of /** @type {const} */ (["month", "year", "nav"])) {
    if (classes && Object.hasOwn(classes, role)) result[role] = normalizeControlClass(classes[role]);
  }
  return result;
}

/**
 * Set defaults for subsequently created elements (existing elements are unchanged).
 * @param {Partial<ControlClasses>} classes
 */
export function setDefaultControlClasses(classes) {
  defaults = resolveControlClasses(classes);
}
