export declare class CalendarModel {
    firstDay: number;
    value: string;
    focused: string;
    display: string;
    /**
     * @param {{value?:string, display?:string, focused?:string, firstDay?:number}} [options]
     */
    constructor(options?: {
        value?: string;
        display?: string;
        focused?: string;
        firstDay?: number;
    });
    /** @param {string} value */
    setValue(value: string): string;
    /** @param {string} value */
    setDisplay(value: string): string;
    /** @param {string} value @param {{follow?:boolean}} [options] */
    setFocused(value: string, options?: {
        follow?: boolean;
    }): string;
    /** @param {number} amount */
    moveFocusDays(amount: number): string;
    /** @param {number} amount */
    moveFocusMonths(amount: number): string;
    /** @param {number} amount */
    moveFocusYears(amount: number): string;
    focusWeekStart(): string;
    focusWeekEnd(): string;
    /** Header/month-select navigation. Value is intentionally untouched. @param {number} amount */
    navigateMonth(amount: number): string;
}
//# sourceMappingURL=calendar-model.d.ts.map