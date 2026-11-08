// The facade:  Route.get('/profile', [controller, 'show']).middleware(authMiddleware).name('profile')
import { Router, type NextFunction, type RequestHandler } from 'express';
import HttpError from '../../error.js';
import { FormRequest, HttpRequest } from '../request/index.js';
import { sendResult } from '../response/index.js';
import { singularize } from '../database/support.js';
import { Middleware } from './Middleware.js';
import { normalize, RouteRegistry } from './RouteRegistry.js';
import { UrlSigner, type SignedUrlOptions } from './UrlSigner.js';
import type {
  GroupOptions,
  HandlerFunction,
  HttpMethod,
  MiddlewareLike,
  RequestClass,
  RouteAction,
  RouteDefinition,
  RouteHandler,
} from './types.js';

const ALL_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sameMiddleware(a: MiddlewareLike, b: MiddlewareLike): boolean {
  return a === b || (typeof a === 'string' && typeof b === 'string' && a === b);
}

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

  withoutMiddleware(...middleware: MiddlewareLike[]): this {
    const items = middleware.flat();
    this.definition.middleware = this.definition.middleware.filter((item) => !items.some((candidate) => sameMiddleware(item, candidate)));
    this.definition.excluded.push(...items);
    return this;
  }

  /** The handler receives this request class. A FormRequest is validated and authorized first: .request(RegisterUserRequest) */
  request(request: RequestClass): this {
    this.definition.request = request;
    return this;
  }

  /** Express 5 has no inline regex (:id(\d+)), so params are checked before middleware runs. A miss falls through to 404. */
  where(param: string, pattern: RegExp): this;
  where(match: Record<string, RegExp>): this;
  where(param: string | Record<string, RegExp>, pattern?: RegExp): this {
    if (typeof param === 'string') {
      this.definition.constraints[param] = new RegExp(pattern!.source, pattern!.flags.replace(/[gy]/g, ''));
      return this;
    }

    Object.entries(param).forEach(([key, value]) => this.where(key, value));
    return this;
  }

  whereNumber(...params: string[]): this {
    params.forEach((p) => this.where(p, /^\d+$/));
    return this;
  }

  whereAlpha(...params: string[]): this {
    params.forEach((p) => this.where(p, /^[A-Za-z]+$/));
    return this;
  }

  whereAlphaNumeric(...params: string[]): this {
    params.forEach((p) => this.where(p, /^[A-Za-z0-9]+$/));
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

export class PendingResource {
  constructor(private readonly routes: PendingRoute[]) {}

  middleware(...middleware: MiddlewareLike[]): this {
    this.routes.forEach((route) => route.middleware(...middleware));
    return this;
  }

  withoutMiddleware(...middleware: MiddlewareLike[]): this {
    this.routes.forEach((route) => route.withoutMiddleware(...middleware));
    return this;
  }

  where(param: string, pattern: RegExp): this;
  where(match: Record<string, RegExp>): this;
  where(param: string | Record<string, RegExp>, pattern?: RegExp): this {
    this.routes.forEach((route) => {
      if (typeof param === 'string') {
        route.where(param, pattern!);
      } else {
        route.where(param);
      }
    });
    return this;
  }

  whereNumber(...params: string[]): this {
    this.routes.forEach((route) => route.whereNumber(...params));
    return this;
  }

  whereAlpha(...params: string[]): this {
    this.routes.forEach((route) => route.whereAlpha(...params));
    return this;
  }

  whereAlphaNumeric(...params: string[]): this {
    this.routes.forEach((route) => route.whereAlphaNumeric(...params));
    return this;
  }

  whereUuid(...params: string[]): this {
    this.routes.forEach((route) => route.whereUuid(...params));
    return this;
  }
}

class GroupBuilder {
  private readonly options: GroupOptions = {};

  prefix(prefix: string): this {
    this.options.prefix = normalize(this.options.prefix ?? '', prefix);
    return this;
  }

  middleware(...middleware: MiddlewareLike[]): this {
    const current = this.options.middleware;
    this.options.middleware = [...(current === undefined ? [] : [current].flat()), ...middleware];
    return this;
  }

  withoutMiddleware(...middleware: MiddlewareLike[]): this {
    const current = this.options.withoutMiddleware;
    this.options.withoutMiddleware = [...(current === undefined ? [] : [current].flat()), ...middleware];
    return this;
  }

  where(param: string, pattern: RegExp): this;
  where(match: Record<string, RegExp>): this;
  where(param: string | Record<string, RegExp>, pattern?: RegExp): this {
    if (typeof param === 'string') {
      this.options.where = {
        ...this.options.where,
        [param]: new RegExp(pattern!.source, pattern!.flags.replace(/[gy]/g, '')),
      };
      return this;
    }

    Object.entries(param).forEach(([key, value]) => this.where(key, value));
    return this;
  }

  controller(controller: object): this {
    this.options.controller = controller;
    return this;
  }

  as(name: string): this {
    this.options.as = (this.options.as ?? '') + name;
    return this;
  }

  name(name: string): this {
    return this.as(name);
    return this;
  }

  group(callback: () => void): void {
    RouteRegistry.group(this.options, callback);
  }
}

export type ResourceAction = 'index' | 'create' | 'store' | 'show' | 'edit' | 'update' | 'destroy';

export interface ResourceOptions {
  only?: ResourceAction[];
  except?: ResourceAction[];
  /** URL parameter name (default 'id') */
  param?: string;
  /** URL parameter names for nested resource segments, e.g. { users: 'user' } */
  parameters?: Record<string, string>;
  /** Request class per action: { store: StoreUserRequest, update: UpdateUserRequest } */
  requests?: Partial<Record<ResourceAction, RequestClass>>;
}

function toExpressPath(uri: string): string {
  return uri
    .replace(/\/\{([^}?]+)\?\}/g, '{/:$1}')
    .replace(/\{([^}/?]+)\}/g, ':$1')
    .replace(/\/\*$/, '/{*splat}');
}

/** Turns a RouteHandler into a plain Express handler: builds the HttpRequest, validates FormRequests, sends the result. */
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
      const RequestType = definition.request ?? HttpRequest;
      const request = new RequestType(req as never);
      if (request instanceof FormRequest) {
        await request.validateResolved();
      }

      const result = await call(request as never, res, forward);
      if (!forwarded) await sendResult(res, result);
    } catch (error) {
      next(error);
    }
  };
}

function constraintGuard(definition: RouteDefinition): RequestHandler | undefined {
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

  /** Respond to every supported HTTP method. */
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

  permanentRedirect: (from: string, to: string) => Route.redirect(from, to, 301),

  /** Route.group({ prefix: '/auth', middleware: ['auth'], as: 'auth.' }, () => { ... }) */
  group: (options: GroupOptions, callback: () => void): void => RouteRegistry.group(options, callback),

  /** Declare routes in a named set: Route.set('web', () => { ... }). */
  set: (name: string, callback: () => void): void => RouteRegistry.useSet(name, callback),

  /** Associate a route set with its application mount path for URL generation. */
  mount: (name: string, prefix: string): void => RouteRegistry.mount(name, prefix),

  controller: <T extends object>(controller: T) => new GroupBuilder().controller(controller),

  /** Fluent groups: Route.prefix('/admin').middleware('auth').as('admin.').group(() => { ... }) */
  prefix: (prefix: string) => new GroupBuilder().prefix(prefix),
  middleware: (...middleware: MiddlewareLike[]) => new GroupBuilder().middleware(...middleware),
  withoutMiddleware: (...middleware: MiddlewareLike[]) => new GroupBuilder().withoutMiddleware(...middleware),
  as: (name: string) => new GroupBuilder().as(name),
  name: (name: string) => new GroupBuilder().name(name),

  pattern: (param: string, pattern: RegExp) => {
    RouteRegistry.setPattern(param, pattern);
    return Route;
  },

  has: (name: string): boolean => RouteRegistry.findAll(name).length > 0,

  /**
   * Route.resource('users', usersController)
   *   index GET /users · store POST /users · show GET /users/{id}
   *   update PUT|PATCH /users/{id} · destroy DELETE /users/{id}
   * Actions the controller does not implement are skipped.
   */
  resource(name: string, controller: object, options: ResourceOptions = {}): PendingResource {
    const param = options.param ?? 'id';
    const segments = name.split(/[./]/).filter(Boolean);
    const base = segments.reduce((result, segment, index) => {
      const prefix = result === '' ? '' : result;
      const path = `${prefix}/${segment}`;
      if (index === segments.length - 1) return path;
      return `${path}/{${options.parameters?.[segment] ?? singularize(segment)}}`;
    }, '');
    const slug = segments.join('.');

    const actions: Array<[ResourceAction, HttpMethod[], string]> = [
      ['index', ['get'], base || '/'],
      ['create', ['get'], `${base}/create`],
      ['store', ['post'], base || '/'],
      ['show', ['get'], `${base}/{${param}}`],
      ['edit', ['get'], `${base}/{${param}}/edit`],
      ['update', ['put', 'patch'], `${base}/{${param}}`],
      ['destroy', ['delete'], `${base}/{${param}}`],
    ];

    const created: PendingRoute[] = [];
    for (const [action, methods, uri] of actions) {
      if (options.only && !options.only.includes(action)) continue;
      if (options.except?.includes(action)) continue;
      if (typeof (controller as Record<string, unknown>)[action] !== 'function') continue;

      const pending = new PendingRoute(RouteRegistry.add(methods, uri, [controller, action]));
      const request = options.requests?.[action];
      if (request) pending.request(request);
      created.push(pending.name([slug, action].filter(Boolean).join('.')));
    }
    return new PendingResource(created);
  },

  apiResource(name: string, controller: object, options: ResourceOptions = {}): PendingResource {
    const except = [...(options.except ?? []), 'create', 'edit'] as ResourceAction[];
    return Route.resource(name, controller, { ...options, except });
  },

  /**
   * Route.url('users.show', { id: 5 })            -> '/users/5'
   * Route.url('users.index', { page: 2 })         -> '/users?page=2'   (params not in the path become the query string)
   * Group and configured set mount prefixes are included.
   */
  url(name: string, params: Record<string, string | number> = {}): string {
    const matches = RouteRegistry.findAll(name);
    if (!matches.length) throw new Error(`Route [${name}] is not defined.`);
    if (matches.length > 1) throw new Error(`Route name [${name}] is ambiguous across route sets.`);
    const route = matches[0]!;

    const used = new Set<string>();
    const path = route.uri.replace(/\{([A-Za-z_][\w]*)(\?)?\}/g, (_match, key: string, optional: string | undefined) => {
      const value = params[key];
      if (value === undefined) {
        if (optional) return '';
        throw new Error(`Route [${name}] is missing the "${key}" parameter.`);
      }
      used.add(key);
      return encodeURIComponent(String(value));
    });

    const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    const mounted = normalize(RouteRegistry.mountFor(RouteRegistry.setFor(route)) ?? '', normalized);
    const rest = Object.entries(params).filter(([key]) => !used.has(key));
    if (!rest.length) return mounted;
    return `${mounted}?${new URLSearchParams(rest.map(([k, v]) => [k, String(v)])).toString()}`;
  },

  /** Generate an absolute HMAC-signed URL for a named route. */
  signedUrl(
    name: string,
    params: Record<string, string | number> = {},
    options: SignedUrlOptions = {},
  ): string {
    return UrlSigner.sign(Route.url(name, params), options);
  },

  fallback: (
    handler: HandlerFunction = (req, _res, next) =>
      next(HttpError.notFound(`Route ${req.method()} ${req.raw.originalUrl} not found.`)),
  ) => {
    const definition = RouteRegistry.add(['get', 'post', 'put', 'patch', 'delete', 'options', 'head'], '/*', handler);
    definition.fallback = true;
    return new PendingRoute(definition);
  },

  /** Every declared route (used by route:list). */
  all: (name?: string): readonly RouteDefinition[] => RouteRegistry.all(name),

  /** Build one named Express router. Call it after declaring that set's routes. */
  router(name = 'default'): Router {
    RouteRegistry.assertValid(name);
    const router = Router();

    const specificity = (definition: RouteDefinition): number =>
      definition.uri.split('/').filter(Boolean).reduce((score, segment) => score + (segment.startsWith('{') ? 0 : 1), 0);
    const entries = [...RouteRegistry.all(name)].sort(
      (a, b) =>
        Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) ||
        Number(b.methods.includes('head') && !b.methods.includes('get')) -
          Number(a.methods.includes('head') && !a.methods.includes('get')) ||
        specificity(b) - specificity(a),
    );
    for (const definition of entries) {
      const guard = constraintGuard(definition);
      const middleware = Middleware.without(definition.middleware, definition.excluded);
      const handlers: RequestHandler[] = [
        ...(guard ? [guard] : []),
        ...middleware.map((item) => Middleware.resolve(item)),
        resolveHandler(definition),
      ];

      for (const method of definition.methods) {
        if (method === 'head' && definition.methods.includes('get')) continue;
        router[method](toExpressPath(definition.uri), ...handlers);
      }
    }
    return router;
  },

  clear: (): void => RouteRegistry.clear(),
};

export default Route;
