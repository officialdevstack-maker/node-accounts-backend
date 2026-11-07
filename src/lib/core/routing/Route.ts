// The facade:  Route.get('/profile', [controller, 'show']).middleware(authMiddleware).name('profile')
import { Router, type RequestHandler } from 'express';
import { normalize, RouteRegistry } from './RouteRegistry.js';
import type { GroupOptions, HttpMethod, RouteDefinition, RouteHandler } from './types.js';

const ALL_METHODS: HttpMethod[] = ['get', 'post', 'put', 'patch', 'delete'];

/** Returned by every Route.get/post/... so you can chain .name() and .middleware(). */
export class PendingRoute {
  constructor(private readonly definition: RouteDefinition) {}

  /** Route name. Group name prefixes are added for you: group as 'auth.' + name('login') = 'auth.login' */
  name(name: string): this {
    this.definition.name = this.definition.namePrefix + name;
    return this;
  }

  middleware(...middleware: RequestHandler[]): this {
    this.definition.middleware.push(...middleware);
    return this;
  }
}

export type ResourceAction = 'index' | 'store' | 'show' | 'update' | 'destroy';

export interface ResourceOptions {
  only?: ResourceAction[];
  except?: ResourceAction[];
  /** URL parameter name (default 'id') */
  param?: string;
}

/** Turns a RouteHandler into a plain Express handler. */
function resolveHandler(definition: RouteDefinition): RequestHandler {
  const { handler } = definition;
  if (!Array.isArray(handler)) return handler;

  const [controller, method] = handler;
  const action = (controller as Record<string, unknown>)[method];

  if (typeof action !== 'function') {
    throw new Error(`Route ${definition.uri}: ${controller.constructor.name} has no method "${method}".`);
  }

  // Keeps `this` working inside controller methods.
  return (req, res, next) => action.call(controller, req, res, next) as void | Promise<void>;
}

/** 'UserController@show' | 'authMiddleware' | 'Closure' (used by route:list) */
export function describeAction(handler: RouteHandler): string {
  if (Array.isArray(handler)) return `${handler[0].constructor.name}@${handler[1]}`;
  return handler.name || 'Closure';
}

export const Route = {
  get: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['get'], uri, handler)),
  post: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['post'], uri, handler)),
  put: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['put'], uri, handler)),
  patch: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['patch'], uri, handler)),
  delete: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['delete'], uri, handler)),
  options: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['options'], uri, handler)),
  head: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(['head'], uri, handler)),

  /** Respond to GET, POST, PUT, PATCH and DELETE. */
  any: (uri: string, handler: RouteHandler) => new PendingRoute(RouteRegistry.add(ALL_METHODS, uri, handler)),

  /** Route.group({ prefix: '/auth', middleware: [authMiddleware], as: 'auth.' }, () => { ... }) */
  group: (options: GroupOptions, callback: () => void): void => RouteRegistry.group(options, callback),

  /**
   * Route.resource('users', usersController)
   *   index GET /users · store POST /users · show GET /users/:id
   *   update PUT|PATCH /users/:id · destroy DELETE /users/:id
   * Actions the controller does not implement are skipped.
   */
  resource(name: string, controller: object, options: ResourceOptions = {}): void {
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

    for (const [action, methods, uri] of actions) {
      if (options.only && !options.only.includes(action)) continue;
      if (options.except?.includes(action)) continue;
      if (typeof (controller as Record<string, unknown>)[action] !== 'function') continue;

      new PendingRoute(RouteRegistry.add(methods, uri, [controller, action])).name(`${slug}.${action}`);
    }
  },

  /** Route.url('users.show', { id: 5 }) -> '/users/5' (group prefixes are included, the mount path like /api is not) */
  url(name: string, params: Record<string, string | number> = {}): string {
    const route = RouteRegistry.find(name);
    if (!route) throw new Error(`Route [${name}] is not defined.`);

    return route.uri.replace(/:(\w+)\??/g, (_match, key: string) => {
      const value = params[key];
      if (value === undefined) throw new Error(`Route [${name}] is missing the "${key}" parameter.`);
      return encodeURIComponent(String(value));
    });
  },

  /** Every declared route (used by route:list). */
  all: (): readonly RouteDefinition[] => RouteRegistry.all(),

  /** Build the Express router. Call it once, after all routes are declared: app.use('/api', Route.router()) */
  router(): Router {
    const router = Router();

    for (const definition of RouteRegistry.all()) {
      const handler = resolveHandler(definition);
      for (const method of definition.methods) {
        router[method](definition.uri, ...definition.middleware, handler);
      }
    }
    return router;
  },

  clear: (): void => RouteRegistry.clear(),
};

export default Route;
