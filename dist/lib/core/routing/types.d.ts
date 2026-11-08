import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { HttpRequest } from '../request/index.js';
export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head';
/** A route handler. It receives an HttpRequest (or your FormRequest). */
export type HandlerFunction = (req: HttpRequest, res: Response, next: NextFunction) => unknown;
/** A request class (HttpRequest or a FormRequest subclass) that the router builds for the handler. */
export type RequestClass = new (raw: Request) => HttpRequest;
/** [controllerInstance, 'methodName'] where the method name is checked against the controller's keys. */
export type ControllerAction<T extends object = object> = [controller: T, method: Extract<keyof T, string>];
/**
 * What you can pass to Route.get(...):
 *   a closure · [controller, 'method'] · or just 'method' inside Route.controller(ctrl).group(...)
 */
export type RouteAction<T extends object = object> = HandlerFunction | ControllerAction<T> | string;
/** What the registry stores (loosely typed on purpose). */
export type RouteHandler = HandlerFunction | [controller: object, method: string];
/** A handler, or an alias like 'auth' / 'throttle:5,1' (see Middleware.alias). */
export type MiddlewareLike = RequestHandler | string;
export interface GroupOptions {
    /** URL prefix for every route in the group, e.g. '/auth' */
    prefix?: string;
    middleware?: MiddlewareLike | MiddlewareLike[];
    /** Middleware inherited from a parent group that should NOT run here */
    withoutMiddleware?: MiddlewareLike | MiddlewareLike[];
    /** Name prefix, e.g. 'auth.' makes .name('login') become 'auth.login' */
    as?: string;
    /** Lets routes in the group use plain method names: Route.get('/x', 'show') */
    controller?: object;
}
export interface RouteDefinition {
    methods: HttpMethod[];
    /** Laravel style: '/users/{id}', '/posts/{slug?}'. Converted to Express syntax in Route.router(). */
    uri: string;
    handler: RouteHandler;
    middleware: MiddlewareLike[];
    /** Middleware removed from this route (see .withoutMiddleware()) */
    excluded: MiddlewareLike[];
    /** Full name including group prefix (set by .name()) */
    name?: string;
    namePrefix: string;
    /** param -> pattern, enforced before any middleware runs */
    constraints: Record<string, RegExp>;
    /** Request class the handler receives (see .request()). Default: HttpRequest */
    request?: RequestClass;
    /** Catch-all registered after every other route (see Route.fallback) */
    fallback?: boolean;
}
//# sourceMappingURL=types.d.ts.map