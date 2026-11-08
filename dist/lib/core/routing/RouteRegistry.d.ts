import type { GroupOptions, HttpMethod, RouteDefinition, RouteHandler } from './types.js';
/** normalize('/api/', 'users', '/{id}') -> '/api/users/{id}' */
export declare const normalize: (...parts: string[]) => string;
export declare class RouteRegistry {
    private static routes;
    private static stack;
    private static patterns;
    private static context;
    static add(methods: HttpMethod[], uri: string, handler: RouteHandler | string): RouteDefinition;
    /** Everything declared inside `callback` inherits the group's prefix, middleware, name prefix and controller. */
    static group(options: GroupOptions, callback: () => void): void;
    /** Global parameter pattern: Route.pattern('id', /^\d+$/) */
    static setPattern(param: string, pattern: RegExp): void;
    static patternFor(param: string): RegExp | undefined;
    static assertValid(): void;
    static all(): readonly RouteDefinition[];
    static find(name: string): RouteDefinition | undefined;
    /** Forget every route (mainly for tests). */
    static clear(): void;
}
//# sourceMappingURL=RouteRegistry.d.ts.map