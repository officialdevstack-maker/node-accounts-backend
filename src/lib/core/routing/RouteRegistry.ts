import type { RequestHandler } from 'express';
import type { GroupOptions, HttpMethod, RouteDefinition, RouteHandler } from './types.js';

interface GroupContext {
  prefix: string;
  middleware: RequestHandler[];
  as: string;
}

/** normalize('/api/', 'users', '/:id') -> '/api/users/:id' */
export const normalize = (...parts: string[]): string =>
  `/${parts.join('/').split('/').filter(Boolean).join('/')}`;

const toArray = <T>(value: T | T[] | undefined): T[] => (value === undefined ? [] : [value].flat() as T[]);

export class RouteRegistry {
  private static routes: RouteDefinition[] = [];
  private static stack: GroupContext[] = [];

  private static context(): GroupContext {
    return this.stack[this.stack.length - 1] ?? { prefix: '/', middleware: [], as: '' };
  }

  static add(methods: HttpMethod[], uri: string, handler: RouteHandler): RouteDefinition {
    const ctx = this.context();
    const definition: RouteDefinition = {
      methods,
      uri: normalize(ctx.prefix, uri),
      handler,
      middleware: [...ctx.middleware],
      namePrefix: ctx.as,
    };
    this.routes.push(definition);
    return definition;
  }

  /** Everything declared inside `callback` inherits the group's prefix, middleware and name prefix. */
  static group(options: GroupOptions, callback: () => void): void {
    const parent = this.context();
    this.stack.push({
      prefix: normalize(parent.prefix, options.prefix ?? ''),
      middleware: [...parent.middleware, ...toArray(options.middleware)],
      as: parent.as + (options.as ?? ''),
    });

    try {
      callback();
    } finally {
      this.stack.pop();
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
  }
}
