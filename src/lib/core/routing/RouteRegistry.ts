import type { GroupOptions, HttpMethod, MiddlewareLike, RouteDefinition, RouteHandler } from './types.js';

interface GroupContext {
  prefix: string;
  middleware: MiddlewareLike[];
  excluded: MiddlewareLike[];
  as: string;
  constraints: Record<string, RegExp>;
  controller: object | undefined;
}

const ROOT: GroupContext = { prefix: '/', middleware: [], excluded: [], as: '', constraints: {}, controller: undefined };

/** normalize('/api/', 'users', '/{id}') -> '/api/users/{id}' */
export const normalize = (...parts: string[]): string =>
  `/${parts.join('/').split('/').filter(Boolean).join('/')}`;

const toArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : ([value].flat() as T[]));

export class RouteRegistry {
  private static routes = new Map<string, RouteDefinition[]>([['default', []]]);
  private static mounts = new Map<string, string>();
  private static activeSet = 'default';
  private static stack: GroupContext[] = [];
  private static patterns = new Map<string, RegExp>();

  private static routesFor(name = this.activeSet): RouteDefinition[] {
    let routes = this.routes.get(name);
    if (!routes) {
      routes = [];
      this.routes.set(name, routes);
    }
    return routes;
  }

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
      constraints: { ...ctx.constraints },
    };
    this.routesFor().push(definition);
    return definition;
  }

  /** Declare routes in an isolated named set while preserving the previous declaration context. */
  static useSet(name: string, callback: () => void): void {
    if (!name.trim()) throw new Error('Route set name cannot be empty.');
    const previousSet = this.activeSet;
    const previousStack = this.stack;
    this.activeSet = name;
    this.stack = [];
    this.routesFor(name);
    try {
      callback();
    } finally {
      this.activeSet = previousSet;
      this.stack = previousStack;
    }
  }

  static setNames(): string[] {
    return [...this.routes.keys()];
  }

  static setFor(route: RouteDefinition): string {
    for (const [name, routes] of this.routes) {
      if (routes.includes(route)) return name;
    }
    return 'default';
  }

  static mount(name: string, prefix: string): void {
    this.mounts.set(name, normalize(prefix));
  }

  static mountFor(name: string): string | undefined {
    return this.mounts.get(name);
  }

  /** Everything declared inside `callback` inherits the group's prefix, middleware, name prefix and controller. */
  static group(options: GroupOptions, callback: () => void): void {
    const parent = this.context();
    this.stack.push({
      prefix: normalize(parent.prefix, options.prefix ?? ''),
      middleware: [...parent.middleware, ...toArray(options.middleware)],
      excluded: [...parent.excluded, ...toArray(options.withoutMiddleware)],
      as: parent.as + (options.as ?? ''),
      constraints: Object.fromEntries(
        Object.entries({ ...parent.constraints, ...options.where }).map(([param, pattern]) => [
          param,
          new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, '')),
        ]),
      ),
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

  static assertValid(setName?: string): void {
    const duplicates: string[] = [];
    const shadowed: string[] = [];

    const selectedSets = setName === undefined ? [...this.routes.entries()] : [[setName, this.routesFor(setName)] as const];
    for (const [, routes] of selectedSets) {
      const seen = new Map<string, RouteDefinition>();
      for (const route of routes) {
        for (const method of route.methods) {
          const segments = route.uri.split('/').filter(Boolean);
          const shape = segments.map((segment) => {
            const param = segment.match(/^\{[^}?]+(\?)?\}$/);
            return param ? `:${param[1] ? '?' : ''}` : segment;
          });
          const key = `${method.toUpperCase()} ${JSON.stringify(shape)}`;
          const earlier = seen.get(key);
          if (earlier) {
            if (earlier.uri === route.uri) {
              duplicates.push(`${method.toUpperCase()} ${route.uri}`);
            } else {
              shadowed.push(`${method.toUpperCase()} ${route.uri} is shadowed by earlier route ${earlier.uri}`);
            }
          } else {
            seen.set(key, route);
          }
        }
      }
    }

    if (duplicates.length) throw new Error(`Duplicate routes declared: ${[...new Set(duplicates)].join(', ')}`);
    if (shadowed.length) throw new Error(`Shadowed routes declared: ${[...new Set(shadowed)].join('; ')}`);
  }

  static all(setName?: string): readonly RouteDefinition[] {
    return setName === undefined ? [...this.routes.values()].flat() : [...(this.routes.get(setName) ?? [])];
  }

  static find(name: string, setName = this.activeSet): RouteDefinition | undefined {
    return this.routesFor(setName).find((route) => route.name === name);
  }

  static findAll(name: string): RouteDefinition[] {
    return this.all().filter((route) => route.name === name);
  }

  /** Forget every route (mainly for tests). */
  static clear(): void {
    this.routes = new Map([['default', []]]);
    this.mounts.clear();
    this.activeSet = 'default';
    this.stack = [];
    this.patterns.clear();
  }
}
