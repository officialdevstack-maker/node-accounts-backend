import type { RequestHandler } from 'express';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/** [controllerInstance, 'methodName'] where the method name is checked against the controller's keys. */
export type ControllerAction<T extends object = object> = [controller: T, method: Extract<keyof T, string>];

/** What you can pass to Route.get(...) */
export type RouteAction<T extends object = object> = RequestHandler | ControllerAction<T>;

/** What the registry stores (loosely typed on purpose). */
export type RouteHandler = RequestHandler | [controller: object, method: string];

/** A handler, or an alias like 'auth' / 'throttle:5,1' (see Middleware.alias). */
export type MiddlewareLike = RequestHandler | string;

export interface GroupOptions {
  /** URL prefix for every route in the group, e.g. '/auth' */
  prefix?: string;
  middleware?: MiddlewareLike | MiddlewareLike[];
  /** Name prefix, e.g. 'auth.' makes .name('login') become 'auth.login' */
  as?: string;
}

export interface RouteDefinition {
  methods: HttpMethod[];
  uri: string;
  handler: RouteHandler;
  middleware: MiddlewareLike[];
  /** Full name including group prefix (set by .name()) */
  name?: string;
  namePrefix: string;
  /** param -> pattern, enforced before any middleware runs */
  constraints: Record<string, RegExp>;
}
