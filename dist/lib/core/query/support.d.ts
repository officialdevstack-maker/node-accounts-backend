export declare function isPlainObject(value: unknown): value is Record<string, unknown>;
/** undefined -> null, bigint -> string, arrays / objects -> JSON (an array would otherwise be expanded into "a, b, c"). */
export declare function normalizeBinding(value: unknown): unknown;
/** The key a column has in the result row: 'users.name' -> 'name', 'name as n' -> 'n' */
export declare function outputKey(column: string): string;
/** Fills the ? placeholders for DISPLAY only (logs, dump). Never execute the result. */
export declare function interpolate(sql: string, bindings: readonly unknown[]): string;
//# sourceMappingURL=support.d.ts.map