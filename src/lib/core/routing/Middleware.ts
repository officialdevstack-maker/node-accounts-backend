import type { RequestHandler } from 'express';
import type { MiddlewareLike } from './types.js';

type Factory = (...params: string[]) => RequestHandler;

export class Middleware {
  private static aliases = new Map<string, Factory>();

  /**
   * Middleware.alias('auth', () => authMiddleware)
   * Middleware.alias('throttle', (limiter = '60', decay = '1') => throttle(...))
   * then .middleware('auth', 'throttle:5,1')
   */
  static alias(name: string, factory: Factory): void {
    if (!/^[a-z][a-z0-9_-]*$/i.test(name)) {
      throw new Error(`"${name}" is not a valid middleware alias.`);
    }
    this.aliases.set(name, factory);
  }

  static resolve(item: MiddlewareLike): RequestHandler {
    if (typeof item === 'function') return item;

    const colon = item.indexOf(':');
    const name = colon === -1 ? item : item.slice(0, colon);
    const raw = colon === -1 ? '' : item.slice(colon + 1);
    const params = raw ? raw.split(',').map((p) => p.trim()) : [];

    const factory = this.aliases.get(name);
    if (!factory) {
      throw new Error(`Middleware alias [${name}] is not registered. Use Middleware.alias('${name}', ...).`);
    }

    return factory(...params);
  }

  /**
   * Does `target` cover `item`? A bare alias covers every parameter variant,
   * while a parameterized alias only covers the exact same string.
   */
  static matches(item: MiddlewareLike, target: MiddlewareLike): boolean {
    if (item === target) return true;

    if (typeof item === 'string' && typeof target === 'string') {
      return target.includes(':') ? item === target : item.split(':')[0] === target;
    }

    if (typeof item === 'string' && typeof target === 'function') {
      return !item.includes(':') && this.aliasHandler(item) === target;
    }

    if (typeof item === 'function' && typeof target === 'string') {
      return !target.includes(':') && this.aliasHandler(target) === item;
    }

    return false;
  }

  /** The middleware that actually runs: `list` minus everything covered by `excluded`. */
  static without(list: readonly MiddlewareLike[], excluded: readonly MiddlewareLike[]): MiddlewareLike[] {
    if (!excluded.length) return [...list];
    return list.filter((item) => !excluded.some((target) => this.matches(item, target)));
  }

  /** Label used by route:list */
  static describe(item: MiddlewareLike): string {
    return typeof item === 'string' ? item : item.name || 'anonymous';
  }

  private static aliasHandler(name: string): RequestHandler | undefined {
    const factory = this.aliases.get(name);
    return factory ? factory() : undefined;
  }
}
