// The facade:  Route.get('/profile', [controller, 'show']).middleware(authMiddleware).name('profile')
import { Router, type NextFunction, type RequestHandler } from 'express';
import { sendResult } from '../response/index.js';
import { Middleware } from './Middleware.js';
import { normalize, RouteRegistry } from './RouteRegistry.js';
import type {
  GroupOptions,
  HandlerFunction,
  HttpMethod,
  MiddlewareLike,
  RouteAction,
  RouteDefinition,
  RouteHandler,
} from './types.js';

const ALL_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Returned by every Route.get/post/... so you can chain .name(), .middleware() and .where(). */
export class PendingRoute {
  constructor(private readonly definition: RouteDefinition) {}

  /** Group name prefixes are added for you: group as 'auth.' + name('login') = 'auth.login' */
  name(name: string): this {
    const full = this.definition.namePrefix + name;
    const existing = RouteRegistry.find(full);
    if (existing && existing !== this.definition) {
      throw new Error(`Route name [${full}] is already used by ${existing.uri}.`);
    }
    this.definition.name = full;
    return this;
  }

  /** Handlers or aliases: .middleware(authMiddleware, 'throttle:5,1') */
  middleware(...middleware: MiddlewareLike[]): this {
    this.definition.middleware.push(...middleware);
    return this;
  }

  /** Express 5 has no inline regex (:id(\d+)), so params are checked before middleware runs. A miss falls through to 404. */
  where(param: string, pattern: RegExp): this {
    this.definition.constraints[param] = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    return this;
  }

  whereNumber(...params: string[]): this {
    params.forEach((p) => this.where(p, /^\d+$/));
    return this;
  }

  whereUuid(...params: string[]): this {
    params.forEach((p) => this.where(p, UUID));
    return this;
  }

  whereIn(param: string, values: string[]): this {
    return this.where(param, new RegExp(`^(?:${values.map(escapeRegex).join('|')})$`));
  }
}

class GroupBuilder {
  private readonly options: GroupOptions = {};

  prefix(prefix: string): this {
    this.options.prefix = prefix;
    return this;
  }

  middleware(...middleware: MiddlewareLike[]): this {
    const current = this.options.middleware;
    this.options.middleware = [...(current === undefined ? [] : [current].flat()), ...middleware];
    return this;
  }

  as(name: string): this {
    this.options.as = name;
    return this;
  }

  group(callback: () => void): void {
    RouteRegistry.group(this.options, callback);
  }
}

export type ResourceAction = 'index' | 'store' | 'show' | 'update' | 'destroy';

export interface ResourceOptions {
  only?: ResourceAction[];
  except?: ResourceAction[];
  /** URL parameter name (default 'id') */
  param?: string;
}

/** Turns a RouteHandler into a plain Express handler that sends whatever the handler returns. */
function resolveHandler(definition: RouteDefinition): RequestHandler {
  const { handler } = definition;
  let call: HandlerFunction;

  if (Array.isArray(handler)) {
    const [controller, method] = handler;
    const action = (controller as Record<string, unknown>)[method];

    if (typeof action !== 'function') {
      throw new Error(`Route ${definition.uri}: ${controller.constructor.name} has no method "${String(method)}".`);
    }

    // Keeps `this` working inside controller methods.
    call = (req, res, next) => action.call(controller, req, res, next);
  } else {
    call = handler;
  }

  return async (req, res, next) => {
    let forwarded = false;
    const forward = ((arg?: unknown) => {
      forwarded = true;
      next(arg as never);
    }) as NextFunction;

    try {
      const result = await call(req, res, forward);
      if (!forwarded) await sendResult(res, result);
    } catch (error) {
      next(error);
    }
  };
}

function constraintGuard(constraints: Record<string, RegExp>): RequestHandler | undefined {
  const entries = Object.entries(constraints);
  if (!entries.length) return undefined;

  return (req, _res, next) => {
    for (const [param, pattern] of entries) {
      const value = req.params[param];
      if (typeof value !== 'string' || !pattern.test(value)) return next('route');
    }
    next();
  };
}

/** 'UserController@show' | 'authMiddleware' | 'Closure' (used by route:list) */
export function describeAction(handler: RouteHandler): string {
  if (Array.isArray(handler)) return `${handler[0].constructor.name}@${String(handler[1])}`;
  return handler.name || 'Closure';
}

const verb =
  (...methods: HttpMethod[]) =>
  <T extends object>(uri: string, handler: RouteAction<T>) =>
    new PendingRoute(RouteRegistry.add(methods, uri, handler as RouteHandler));

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
  match: <T extends object>(methods: HttpMethod[], uri: string, handler: RouteAction<T>) =>
    new PendingRoute(RouteRegistry.add(methods, uri, handler as RouteHandler)),

  /** Route.redirect('/old', '/new', 301) */
  redirect: (from: string, to: string, status = 302) =>
    new PendingRoute(
      RouteRegistry.add(['get'], from, (_req, res) => {
        res.redirect(status, to);
      }),
    ),

  /** Route.group({ prefix: '/auth', middleware: ['auth'], as: 'auth.' }, () => { ... }) */
  group: (options: GroupOptions, callback: () => void): void => RouteRegistry.group(options, callback),

  /** Fluent groups: Route.prefix('/admin').middleware('auth').as('admin.').group(() => { ... }) */
  prefix: (prefix: string) => new GroupBuilder().prefix(prefix),
  middleware: (...middleware: MiddlewareLike[]) => new GroupBuilder().middleware(...middleware),
  as: (name: string) => new GroupBuilder().as(name),

  /**
   * Route.resource('users', usersController)
   *   index GET /users · store POST /users · show GET /users/:id
   *   update PUT|PATCH /users/:id · destroy DELETE /users/:id
   * Actions the controller does not implement are skipped.
   */
  resource(name: string, controller: object, options: ResourceOptions = {}): PendingRoute[] {
    const param = options.param ?? 'id';
    const base = normalize(name);
    const slug = name.split('/').filter(Boolean).join('.');

    const actions: Array<[ResourceAction, HttpMethod[], string]> = [
      ['index', ['get'], base],
      ['store', ['post'], base],
      ['show', ['get'], `${base}/:${param}`],
      ['update', ['put', 'patch'], `${base}/:${param}`],
      ['destroy', ['delete'], `${base}/:${param}`],
    ];

    const created: PendingRoute[] = [];
    for (const [action, methods, uri] of actions) {
      if (options.only && !options.only.includes(action)) continue;
      if (options.except?.includes(action)) continue;
      if (typeof (controller as Record<string, unknown>)[action] !== 'function') continue;

      const pending = new PendingRoute(RouteRegistry.add(methods, uri, [controller, action]));
      created.push(pending.name([slug, action].filter(Boolean).join('.')));
    }
    return created;
  },

  /**
   * Route.url('users.show', { id: 5 })            -> '/users/5'
   * Route.url('users.index', { page: 2 })         -> '/users?page=2'   (params not in the path become the query string)
   * Group prefixes are included, the mount path (like /api) is not.
   */
  url(name: string, params: Record<string, string | number> = {}): string {
    const route = RouteRegistry.find(name);
    if (!route) throw new Error(`Route [${name}] is not defined.`);

    const used = new Set<string>();
    const path = route.uri.replace(/:(\w+)/g, (_match, key: string) => {
      const value = params[key];
      if (value === undefined) throw new Error(`Route [${name}] is missing the "${key}" parameter.`);
      used.add(key);
      return encodeURIComponent(String(value));
    });

    const rest = Object.entries(params).filter(([key]) => !used.has(key));
    if (!rest.length) return path;
    return `${path}?${new URLSearchParams(rest.map(([k, v]) => [k, String(v)])).toString()}`;
  },

  /** Every declared route (used by route:list). */
  all: (): readonly RouteDefinition[] => RouteRegistry.all(),

  /** Build the Express router. Call it once, after all routes are declared: app.use('/api', Route.router()) */
  router(): Router {
    RouteRegistry.assertValid();
    const router = Router();

    for (const definition of RouteRegistry.all()) {
      const guard = constraintGuard(definition.constraints);
      const handlers: RequestHandler[] = [
        ...(guard ? [guard] : []),
        ...definition.middleware.map((middleware) => Middleware.resolve(middleware)),
        resolveHandler(definition),
      ];

      for (const method of definition.methods) {
        router[method](definition.uri, ...handlers);
      }
    }
    return router;
  },

  clear: (): void => RouteRegistry.clear(),
};

export default Route;
