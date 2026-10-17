/** @typedef {{ month: string, year: string, nav: string }} ControlClasses */
export type ControlClasses = {
    month: string;
    year: string;
    nav: string;
};
/**
 * Normalize author class tokens. The dp-* namespace belongs to the component.
 * @param {unknown} value
 */
export declare function normalizeControlClass(value: unknown): string;
/** @param {ControlClasses} a @param {ControlClasses} b */
export declare function sameControlClasses(a: ControlClasses, b: ControlClasses): boolean;
export declare function getDefaultControlClasses(): {
    month: string;
    year: string;
    nav: string;
};
/**
 * Preserve omitted roles so they can inherit defaults when rendered.
 * @param {Partial<ControlClasses> | null} classes
 * @returns {Partial<ControlClasses> | null}
 */
export declare function normalizeControlClasses(classes: Partial<ControlClasses> | null): Partial<ControlClasses> | null;
/** @param {Partial<ControlClasses> | null} classes */
export declare function usesDefaultControlClasses(classes: Partial<ControlClasses> | null): boolean;
/** @param {Partial<ControlClasses> | null} classes */
export declare function resolveControlClasses(classes: Partial<ControlClasses> | null): {
    month: string;
    year: string;
    nav: string;
};
/**
 * Set defaults and refresh connected elements with inherited control roles.
 * @param {Partial<ControlClasses>} classes
 */
export declare function setDefaultControlClasses(classes: Partial<ControlClasses>): void;
/** @param {() => void} listener */
export declare function subscribeDefaultControlClasses(listener: () => void): () => void;
//# sourceMappingURL=control-classes.d.ts.map