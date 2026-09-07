/**
 * Normalize source payloads to a Map keyed by canonical date.
 * Accepted shapes: { dates: {...} }, { "YYYY-MM-DD": {...} }, or [{date,...}].
 * @param {unknown} payload
 * @returns {Map<string, Record<string, unknown>>}
 */
export declare function normalizeDateStates(payload: unknown): Map<string, Record<string, unknown>>;
/**
 * Small fetch adapter for legacy/configUrl-like endpoints.
 * @param {string | URL} url
 * @param {{map?:(payload:unknown)=>unknown, params?:(range:{start:string,end:string})=>Record<string,string>}} [options]
 */
export declare function createFetchSource(url: string | URL, options?: {
    map?: (payload: unknown) => unknown;
    params?: (range: {
        start: string;
        end: string;
    }) => Record<string, string>;
}): {
    /** @param {{start:string,end:string}} range @param {{signal?:AbortSignal}} [context] */
    load(range: {
        start: string;
        end: string;
    }, context?: {
        signal?: AbortSignal;
    }): Promise<any>;
};
//# sourceMappingURL=source.d.ts.map