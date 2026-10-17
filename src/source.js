/**
 * Normalize source payloads to a Map keyed by canonical date.
 * Accepted shapes: { dates: {...} }, { "YYYY-MM-DD": {...} }, or [{date,...}].
 * @param {unknown} payload
 * @returns {Map<string, Record<string, unknown>>}
 */
export function normalizeDateStates(payload) {
  const raw =
    payload && typeof payload === "object" && !Array.isArray(payload) && "dates" in payload
      ? /** @type {{dates:unknown}} */ (payload).dates
      : payload;
  const map = new Map();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object" || !("date" in item)) continue;
      const { date, ...state } = /** @type {{date:string} & Record<string, unknown>} */ (item);
      map.set(String(date), state);
    }
    return map;
  }
  if (raw && typeof raw === "object") {
    for (const [date, state] of Object.entries(raw)) {
      map.set(date, state && typeof state === "object" ? /** @type {Record<string, unknown>} */ (state) : {});
    }
  }
  return map;
}

/**
 * Small fetch adapter for legacy/configUrl-like endpoints.
 * Resolve and validate the URL immediately against the document or worker location.
 * @param {string | URL} url
 * @param {{map?:(payload:unknown)=>unknown, params?:(range:{start:string,end:string})=>Record<string,string>}} [options]
 */
export function createFetchSource(url, options = {}) {
  const base = typeof document !== "undefined" ? document.baseURI : globalThis.location?.href;
  let resolved;
  try {
    resolved = new URL(String(url), base);
  } catch (cause) {
    throw new TypeError(
      base
        ? `Invalid date source URL: ${url}`
        : "Date source: absolute URL required outside a document or worker location",
      { cause },
    );
  }
  return {
    /** @param {{start:string,end:string}} range @param {{signal?:AbortSignal}} [context] */
    async load(range, context = {}) {
      const target = new URL(resolved);
      const params = options.params ? options.params(range) : range;
      for (const [key, value] of Object.entries(params)) target.searchParams.set(key, String(value));
      const response = await fetch(target, { signal: context.signal });
      if (!response.ok) throw new Error(`Date source failed with HTTP ${response.status}`);
      const payload = await response.json();
      return options.map ? options.map(payload) : payload;
    },
  };
}
