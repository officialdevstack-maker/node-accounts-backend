import type { RequestHandler } from 'express';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';

/** [controllerInstance, 'methodName'], like Laravel's [UserController::class, 'index'] */
export type ControllerAction = [controller: object, method: string];

export type RouteHandler = RequestHandler | ControllerAction;

export interface GroupOptions {
  /** URL prefix for every route in the group, e.g. '/auth' */
  prefix?: string;
  /** Middleware applied to every route in the group */
  middleware?: RequestHandler | RequestHandler[];
  /** Name prefix, e.g. 'auth.' makes .name('login') become 'auth.login' */
  as?: string;
}

export interface RouteDefinition {
  methods: HttpMethod[];
  uri: string;
  handler: RouteHandler;
  middleware: RequestHandler[];
  /** Full name including group prefix (set by .name()) */
  name?: string;
  /** Name prefix inherited from the groups this route was declared in */
  namePrefix: string;
}
