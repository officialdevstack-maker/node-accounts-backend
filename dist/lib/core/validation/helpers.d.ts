import type { Data } from "./types.js";
export declare const isBlank: (v: unknown) => boolean;
/** getByPath(data, "items.0.name") */
export declare function getByPath(obj: any, path: string): any;
export declare function hasPath(obj: any, path: string): boolean;
export declare function setByPath(obj: Data, path: string, value: unknown): void;
/** Expands "items.*.name" into ["items.0.name", "items.1.name", ...] using the data. */
export declare function expandPath(data: Data, pattern: string): string[];
//# sourceMappingURL=helpers.d.ts.map