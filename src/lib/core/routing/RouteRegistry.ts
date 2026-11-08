import type { GroupOptions, HttpMethod, MiddlewareLike, RouteDefinition, RouteHandler } from './types.js';

interface GroupContext {
  prefix: string;
  middleware: MiddlewareLike[];
  excluded: MiddlewareLike[];
  as: string;
  controller: object | undefined;
}

const ROOT: GroupContext = { prefix: '/', middleware: [], excluded: [], as: '', controller: undefined };

/** normalize('/api/', 'users', '/{id}') -> '/api/users/{id}' */
export const normalize = (...parts: string[]): string =>
  `/${parts.join('/').split('/').filter(Boolean).join('/')}`;

const toArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : ([value].flat() as T[]));

export class RouteRegistry {
  private static routes: RouteDefinition[] = [];
  private static stack: GroupContext[] = [];
  private static patterns = new Map<string, RegExp>();

  private static context(): GroupContext {
    return this.stack[this.stack.length - 1] ?? ROOT;
  }

  static add(methods: HttpMethod[], uri: string, handler: RouteHandler | string): RouteDefinition {
    const ctx = this.context();
    let resolved: RouteHandler;

    if (typeof handler === 'string') {
      if (!ctx.controller) {
        throw new Error(
          `Route ${uri}: "${handler}" is only a method name. Declare it inside Route.controller(controller).group(() => { ... }), or pass [controller, '${handler}']`,
        );
      }
      resolved = [ctx.controller, handler];
    } else {
      resolved = handler;
    }

    const definition: RouteDefinition = {
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
  static group(options: GroupOptions, callback: () => void): void {
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
    } finally {
      this.stack.pop();
    }
  }

  /** Global parameter pattern: Route.pattern('id', /^\d+$/) */
  static setPattern(param: string, pattern: RegExp): void {
    this.patterns.set(param, new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')));
  }

  static patternFor(param: string): RegExp | undefined {
    return this.patterns.get(param);
  }

  static assertValid(): void {
    const seen = new Map<string, RouteDefinition>();
    const clashes: string[] = [];

    for (const route of this.routes) {
      for (const method of route.methods) {
        const key = `${method.toUpperCase()} ${route.uri}`;
        if (seen.has(key)) clashes.push(key);
        seen.set(key, route);
      }
    }

    if (clashes.length) {
      throw new Error(`Duplicate routes declared: ${[...new Set(clashes)].join(', ')}`);
    }
  }

  static all(): readonly RouteDefinition[] {
    return this.routes;
  }

  static find(name: string): RouteDefinition | undefined {
    return this.routes.find((route) => route.name === name);
  }

  /** Forget every route (mainly for tests). */
  static clear(): void {
    this.routes = [];
    this.stack = [];
    this.patterns.clear();
  }
}
