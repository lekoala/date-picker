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
/** @param {Partial<ControlClasses> | null} classes */
export declare function resolveControlClasses(classes: Partial<ControlClasses> | null): {
    month: string;
    year: string;
    nav: string;
};
/**
 * Set defaults for subsequently created elements (existing elements are unchanged).
 * @param {Partial<ControlClasses>} classes
 */
export declare function setDefaultControlClasses(classes: Partial<ControlClasses>): void;
//# sourceMappingURL=control-classes.d.ts.map