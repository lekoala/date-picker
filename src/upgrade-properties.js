/**
 * Replay properties assigned before custom-element definition through their setters.
 * Call only once the element is ready to accept the listed properties.
 * @param {HTMLElement} element
 * @param {string[]} properties
 */
export function upgradeProperties(element, properties) {
  for (const property of properties) {
    if (!Object.hasOwn(element, property)) continue;
    const value = Reflect.get(element, property);
    Reflect.deleteProperty(element, property);
    Reflect.set(element, property, value);
  }
}
