import type { RequestHandler } from 'express';
import type { MiddlewareLike } from './types.js';
type Factory = (...params: string[]) => RequestHandler;
export declare class Middleware {
    private static aliases;
    /**
     * Middleware.alias('auth', () => authMiddleware)
     * Middleware.alias('throttle', (limiter = '60', decay = '1') => throttle(...))
     * then .middleware('auth', 'throttle:5,1')
     */
    static alias(name: string, factory: Factory): void;
    static resolve(item: MiddlewareLike): RequestHandler;
    /**
     * Does `target` cover `item`? A bare alias covers every parameter variant,
     * while a parameterized alias only covers the exact same string.
     */
    static matches(item: MiddlewareLike, target: MiddlewareLike): boolean;
    /** The middleware that actually runs: `list` minus everything covered by `excluded`. */
    static without(list: readonly MiddlewareLike[], excluded: readonly MiddlewareLike[]): MiddlewareLike[];
    /** Label used by route:list */
    static describe(item: MiddlewareLike): string;
    private static aliasHandler;
}
export {};
//# sourceMappingURL=Middleware.d.ts.map