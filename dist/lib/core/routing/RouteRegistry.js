const ROOT = { prefix: '/', middleware: [], excluded: [], as: '', controller: undefined };
/** normalize('/api/', 'users', '/{id}') -> '/api/users/{id}' */
export const normalize = (...parts) => `/${parts.join('/').split('/').filter(Boolean).join('/')}`;
const toArray = (value) => (value === undefined ? [] : [value].flat());
export class RouteRegistry {
    static routes = [];
    static stack = [];
    static patterns = new Map();
    static context() {
        return this.stack[this.stack.length - 1] ?? ROOT;
    }
    static add(methods, uri, handler) {
        const ctx = this.context();
        let resolved;
        if (typeof handler === 'string') {
            if (!ctx.controller) {
                throw new Error(`Route ${uri}: "${handler}" is only a method name. Declare it inside Route.controller(controller).group(() => { ... }), or pass [controller, '${handler}']`);
            }
            resolved = [ctx.controller, handler];
        }
        else {
            resolved = handler;
        }
        const definition = {
            methods,
            uri: normalize(ctx.prefix, uri),
            handler: resolved,
            middleware: [...ctx.middleware],
            excluded: [...ctx.excluded],
            namePrefix: ctx.as,
            constraints: {},
        };
        this.routes.push(definition);
        return definition;
    }
    /** Everything declared inside `callback` inherits the group's prefix, middleware, name prefix and controller. */
    static group(options, callback) {
        const parent = this.context();
        this.stack.push({
            prefix: normalize(parent.prefix, options.prefix ?? ''),
            middleware: [...parent.middleware, ...toArray(options.middleware)],
            excluded: [...parent.excluded, ...toArray(options.withoutMiddleware)],
            as: parent.as + (options.as ?? ''),
            controller: options.controller ?? parent.controller,
        });
        try {
            callback();
        }
        finally {
            this.stack.pop();
        }
    }
    /** Global parameter pattern: Route.pattern('id', /^\d+$/) */
    static setPattern(param, pattern) {
        this.patterns.set(param, new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')));
    }
    static patternFor(param) {
        return this.patterns.get(param);
    }
    static assertValid() {
        const seen = new Map();
        const clashes = [];
        for (const route of this.routes) {
            for (const method of route.methods) {
                const key = `${method.toUpperCase()} ${route.uri}`;
                if (seen.has(key))
                    clashes.push(key);
                seen.set(key, route);
            }
        }
        if (clashes.length) {
            throw new Error(`Duplicate routes declared: ${[...new Set(clashes)].join(', ')}`);
        }
    }
    static all() {
        return this.routes;
    }
    static find(name) {
        return this.routes.find((route) => route.name === name);
    }
    /** Forget every route (mainly for tests). */
    static clear() {
        this.routes = [];
        this.stack = [];
        this.patterns.clear();
    }
}
//# sourceMappingURL=RouteRegistry.js.map