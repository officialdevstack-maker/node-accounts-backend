import type { Request } from 'express';
import type { Attributes, Data, Messages, Rules } from '../validation/types.js';
/** Laravel-style wrapper around the Express request. The original is always available as `req.raw`. */
export declare class HttpRequest {
    readonly raw: Request;
    private extra;
    private clean;
    constructor(raw: Request);
    get body(): Data;
    get params(): Record<string, string>;
    get headers(): Request['headers'];
    get cookies(): Record<string, string>;
    get user(): any;
    get auth(): any;
    all(): Data;
    input(): Data;
    input(key: string, fallback?: unknown): any;
    query(): Data;
    query(key: string, fallback?: unknown): any;
    post(): Data;
    post(key: string, fallback?: unknown): any;
    route(): Record<string, string>;
    route(key: string, fallback?: string): string | undefined;
    only(...keys: string[]): Data;
    except(...keys: string[]): Data;
    has(...keys: string[]): boolean;
    hasAny(...keys: string[]): boolean;
    filled(...keys: string[]): boolean;
    missing(...keys: string[]): boolean;
    string(key: string, fallback?: string): string;
    integer(key: string, fallback?: number): number;
    boolean(key: string, fallback?: boolean): boolean;
    merge(data: Data): this;
    method(): string;
    isMethod(method: string): boolean;
    path(): string;
    url(): string;
    fullUrl(): string;
    ip(): string | undefined;
    header(name: string, fallback?: string): string | undefined;
    cookie(name: string, fallback?: string): string | undefined;
    userAgent(): string | undefined;
    bearerToken(): string | null;
    isJson(): boolean;
    wantsJson(): boolean;
    validate<T = Data>(rules: Rules, messages?: Messages, attributes?: Attributes): Promise<T>;
    validated<T = Data>(): T;
}
//# sourceMappingURL=HttpRequest.d.ts.map