// The facade:  Route.get('/profile', [controller, 'show']).middleware(authMiddleware).name('profile')
import { Router } from 'express';
import { FormRequest, HttpRequest } from '../request/index.js';
import { sendResult } from '../response/index.js';
import { Middleware } from './Middleware.js';
import { normalize, RouteRegistry } from './RouteRegistry.js';
const ALL_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function sameMiddleware(a, b) {
    return a === b || (typeof a === 'string' && typeof b === 'string' && a === b);
}
/** Returned by every Route.get/post/... so you can chain .name(), .middleware() and .where(). */
export class PendingRoute {
    definition;
    constructor(definition) {
        this.definition = definition;
    }
    /** Group name prefixes are added for you: group as 'auth.' + name('login') = 'auth.login' */
    name(name) {
        const full = this.definition.namePrefix + name;
        const existing = RouteRegistry.find(full);
        if (existing && existing !== this.definition) {
            throw new Error(`Route name [${full}] is already used by ${existing.uri}.`);
        }
        this.definition.name = full;
        return this;
    }
    /** Handlers or aliases: .middleware(authMiddleware, 'throttle:5,1') */
    middleware(...middleware) {
        this.definition.middleware.push(...middleware);
        return this;
    }
    withoutMiddleware(...middleware) {
        const items = middleware.flat();
        this.definition.middleware = this.definition.middleware.filter((item) => !items.some((candidate) => sameMiddleware(item, candidate)));
        this.definition.excluded.push(...items);
        return this;
    }
    /** The handler receives this request class. A FormRequest is validated and authorized first: .request(RegisterUserRequest) */
    request(request) {
        this.definition.request = request;
        return this;
    }
    where(param, pattern) {
        if (typeof param === 'string') {
            this.definition.constraints[param] = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
            return this;
        }
        Object.entries(param).forEach(([key, value]) => this.where(key, value));
        return this;
    }
    whereNumber(...params) {
        params.forEach((p) => this.where(p, /^\d+$/));
        return this;
    }
    whereAlpha(...params) {
        params.forEach((p) => this.where(p, /^[A-Za-z]+$/));
        return this;
    }
    whereAlphaNumeric(...params) {
        params.forEach((p) => this.where(p, /^[A-Za-z0-9]+$/));
        return this;
    }
    whereUuid(...params) {
        params.forEach((p) => this.where(p, UUID));
        return this;
    }
    whereIn(param, values) {
        return this.where(param, new RegExp(`^(?:${values.map(escapeRegex).join('|')})$`));
    }
}
export class PendingResource {
    routes;
    constructor(routes) {
        this.routes = routes;
    }
    middleware(...middleware) {
        this.routes.forEach((route) => route.middleware(...middleware));
        return this;
    }
    withoutMiddleware(...middleware) {
        this.routes.forEach((route) => route.withoutMiddleware(...middleware));
        return this;
    }
    where(param, pattern) {
        this.routes.forEach((route) => {
            if (typeof param === 'string') {
                route.where(param, pattern);
            }
            else {
                route.where(param);
            }
        });
        return this;
    }
    whereNumber(...params) {
        this.routes.forEach((route) => route.whereNumber(...params));
        return this;
    }
    whereAlpha(...params) {
        this.routes.forEach((route) => route.whereAlpha(...params));
        return this;
    }
    whereAlphaNumeric(...params) {
        this.routes.forEach((route) => route.whereAlphaNumeric(...params));
        return this;
    }
    whereUuid(...params) {
        this.routes.forEach((route) => route.whereUuid(...params));
        return this;
    }
}
class GroupBuilder {
    options = {};
    prefix(prefix) {
        this.options.prefix = prefix;
        return this;
    }
    middleware(...middleware) {
        const current = this.options.middleware;
        this.options.middleware = [...(current === undefined ? [] : [current].flat()), ...middleware];
        return this;
    }
    withoutMiddleware(...middleware) {
        const current = this.options.withoutMiddleware;
        this.options.withoutMiddleware = [...(current === undefined ? [] : [current].flat()), ...middleware];
        return this;
    }
    controller(controller) {
        this.options.controller = controller;
        return this;
    }
    as(name) {
        this.options.as = name;
        return this;
    }
    group(callback) {
        RouteRegistry.group(this.options, callback);
    }
}
function toExpressPath(uri) {
    return uri
        .replace(/\/\{([^}?]+)\?\}/g, '{/:$1}')
        .replace(/\{([^}/?]+)\}/g, ':$1')
        .replace(/\/\*$/, '/{*splat}');
}
/** Turns a RouteHandler into a plain Express handler: builds the HttpRequest, validates FormRequests, sends the result. */
function resolveHandler(definition) {
    const { handler } = definition;
    let call;
    if (Array.isArray(handler)) {
        const [controller, method] = handler;
        const action = controller[method];
        if (typeof action !== 'function') {
            throw new Error(`Route ${definition.uri}: ${controller.constructor.name} has no method "${String(method)}".`);
        }
        // Keeps `this` working inside controller methods.
        call = (req, res, next) => action.call(controller, req, res, next);
    }
    else {
        call = handler;
    }
    return async (req, res, next) => {
        let forwarded = false;
        const forward = ((arg) => {
            forwarded = true;
            next(arg);
        });
        try {
            const RequestType = definition.request ?? HttpRequest;
            const request = new RequestType(req);
            if (request instanceof FormRequest) {
                await request.validateResolved();
            }
            const result = await call(request, res, forward);
            if (!forwarded)
                await sendResult(res, result);
        }
        catch (error) {
            next(error);
        }
    };
}
function constraintGuard(definition) {
    const entries = [...Object.entries(definition.constraints)];
    const patternParams = [...definition.uri.matchAll(/\{([A-Za-z_][\w]*)(\?)?\}/g)].flatMap((match) => {
        const param = match[1];
        return param ? [param] : [];
    });
    for (const param of patternParams) {
        const globalPattern = RouteRegistry.patternFor(param);
        if (!entries.some(([key]) => key === param) && globalPattern) {
            entries.push([param, globalPattern]);
        }
    }
    if (!entries.length)
        return undefined;
    return (req, _res, next) => {
        for (const [param, pattern] of entries) {
            const value = req.params[param];
            if (typeof value !== 'string' || !pattern.test(value))
                return next('route');
        }
        next();
    };
}
/** 'UserController@show' | 'authMiddleware' | 'Closure' (used by route:list) */
export function describeAction(handler) {
    if (Array.isArray(handler))
        return `${handler[0].constructor.name}@${String(handler[1])}`;
    return handler.name || 'Closure';
}
const verb = (...methods) => (uri, handler) => new PendingRoute(RouteRegistry.add(methods, uri, handler));
export const Route = {
    get: verb('get'),
    post: verb('post'),
    put: verb('put'),
    patch: verb('patch'),
    delete: verb('delete'),
    options: verb('options'),
    head: verb('head'),
    /** Respond to GET, POST, PUT, PATCH and DELETE. */
    any: verb(...ALL_METHODS),
    /** Route.match(['get', 'post'], '/webhook', handler) */
    match: (methods, uri, handler) => new PendingRoute(RouteRegistry.add(methods, uri, handler)),
    /** Route.redirect('/old', '/new', 301) */
    redirect: (from, to, status = 302) => new PendingRoute(RouteRegistry.add(['get'], from, (_req, res) => {
        res.redirect(status, to);
    })),
    permanentRedirect: (from, to) => Route.redirect(from, to, 301),
    /** Route.group({ prefix: '/auth', middleware: ['auth'], as: 'auth.' }, () => { ... }) */
    group: (options, callback) => RouteRegistry.group(options, callback),
    controller: (controller) => new GroupBuilder().controller(controller),
    /** Fluent groups: Route.prefix('/admin').middleware('auth').as('admin.').group(() => { ... }) */
    prefix: (prefix) => new GroupBuilder().prefix(prefix),
    middleware: (...middleware) => new GroupBuilder().middleware(...middleware),
    as: (name) => new GroupBuilder().as(name),
    pattern: (param, pattern) => {
        RouteRegistry.setPattern(param, pattern);
        return Route;
    },
    has: (name) => !!RouteRegistry.find(name),
    /**
     * Route.resource('users', usersController)
     *   index GET /users · store POST /users · show GET /users/{id}
     *   update PUT|PATCH /users/{id} · destroy DELETE /users/{id}
     * Actions the controller does not implement are skipped.
     */
    resource(name, controller, options = {}) {
        const param = options.param ?? 'id';
        const segments = name.split(/[./]/).filter(Boolean);
        const base = segments.reduce((result, segment, index) => {
            const prefix = result === '' ? '' : result;
            const path = `${prefix}/${segment}`;
            if (index === segments.length - 1)
                return path;
            return `${path}/{${segment.replace(/s$/, '')}}`;
        }, '');
        const slug = segments.join('.');
        const actions = [
            ['index', ['get'], base || '/'],
            ['create', ['get'], `${base}/create`],
            ['store', ['post'], base || '/'],
            ['show', ['get'], `${base}/{${param}}`],
            ['edit', ['get'], `${base}/{${param}}/edit`],
            ['update', ['put', 'patch'], `${base}/{${param}}`],
            ['destroy', ['delete'], `${base}/{${param}}`],
        ];
        const created = [];
        for (const [action, methods, uri] of actions) {
            if (options.only && !options.only.includes(action))
                continue;
            if (options.except?.includes(action))
                continue;
            if (typeof controller[action] !== 'function')
                continue;
            const pending = new PendingRoute(RouteRegistry.add(methods, uri, [controller, action]));
            const request = options.requests?.[action];
            if (request)
                pending.request(request);
            created.push(pending.name([slug, action].filter(Boolean).join('.')));
        }
        return new PendingResource(created);
    },
    apiResource(name, controller, options = {}) {
        const except = [...(options.except ?? []), 'create', 'edit'];
        return Route.resource(name, controller, { ...options, except });
    },
    /**
     * Route.url('users.show', { id: 5 })            -> '/users/5'
     * Route.url('users.index', { page: 2 })         -> '/users?page=2'   (params not in the path become the query string)
     * Group prefixes are included, the mount path (like /api) is not.
     */
    url(name, params = {}) {
        const route = RouteRegistry.find(name);
        if (!route)
            throw new Error(`Route [${name}] is not defined.`);
        const used = new Set();
        const path = route.uri.replace(/\{([A-Za-z_][\w]*)(\?)?\}/g, (_match, key, optional) => {
            const value = params[key];
            if (value === undefined) {
                if (optional)
                    return '';
                throw new Error(`Route [${name}] is missing the "${key}" parameter.`);
            }
            used.add(key);
            return encodeURIComponent(String(value));
        });
        const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '');
        const rest = Object.entries(params).filter(([key]) => !used.has(key));
        if (!rest.length)
            return normalized;
        return `${normalized}?${new URLSearchParams(rest.map(([k, v]) => [k, String(v)])).toString()}`;
    },
    fallback: (handler = (_req, res) => res.status(404).send('Not Found')) => {
        const definition = RouteRegistry.add(['get', 'post', 'put', 'patch', 'delete', 'options', 'head'], '/*', handler);
        definition.fallback = true;
        return new PendingRoute(definition);
    },
    /** Every declared route (used by route:list). */
    all: () => RouteRegistry.all(),
    /** Build the Express router. Call it once, after all routes are declared: app.use('/api', Route.router()) */
    router() {
        RouteRegistry.assertValid();
        const router = Router();
        const entries = [...RouteRegistry.all()].sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)));
        for (const definition of entries) {
            const guard = constraintGuard(definition);
            const middleware = Middleware.without(definition.middleware, definition.excluded);
            const handlers = [
                ...(guard ? [guard] : []),
                ...middleware.map((item) => Middleware.resolve(item)),
                resolveHandler(definition),
            ];
            for (const method of definition.methods) {
                router[method](toExpressPath(definition.uri), ...handlers);
            }
        }
        return router;
    },
    clear: () => RouteRegistry.clear(),
};
export default Route;
//# sourceMappingURL=Route.js.map