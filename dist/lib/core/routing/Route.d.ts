import { Router } from 'express';
import type { GroupOptions, HandlerFunction, HttpMethod, MiddlewareLike, RequestClass, RouteAction, RouteDefinition, RouteHandler } from './types.js';
/** Returned by every Route.get/post/... so you can chain .name(), .middleware() and .where(). */
export declare class PendingRoute {
    private readonly definition;
    constructor(definition: RouteDefinition);
    /** Group name prefixes are added for you: group as 'auth.' + name('login') = 'auth.login' */
    name(name: string): this;
    /** Handlers or aliases: .middleware(authMiddleware, 'throttle:5,1') */
    middleware(...middleware: MiddlewareLike[]): this;
    withoutMiddleware(...middleware: MiddlewareLike[]): this;
    /** The handler receives this request class. A FormRequest is validated and authorized first: .request(RegisterUserRequest) */
    request(request: RequestClass): this;
    /** Express 5 has no inline regex (:id(\d+)), so params are checked before middleware runs. A miss falls through to 404. */
    where(param: string, pattern: RegExp): this;
    where(match: Record<string, RegExp>): this;
    whereNumber(...params: string[]): this;
    whereAlpha(...params: string[]): this;
    whereAlphaNumeric(...params: string[]): this;
    whereUuid(...params: string[]): this;
    whereIn(param: string, values: string[]): this;
}
export declare class PendingResource {
    private readonly routes;
    constructor(routes: PendingRoute[]);
    middleware(...middleware: MiddlewareLike[]): this;
    withoutMiddleware(...middleware: MiddlewareLike[]): this;
    where(param: string, pattern: RegExp): this;
    where(match: Record<string, RegExp>): this;
    whereNumber(...params: string[]): this;
    whereAlpha(...params: string[]): this;
    whereAlphaNumeric(...params: string[]): this;
    whereUuid(...params: string[]): this;
}
declare class GroupBuilder {
    private readonly options;
    prefix(prefix: string): this;
    middleware(...middleware: MiddlewareLike[]): this;
    withoutMiddleware(...middleware: MiddlewareLike[]): this;
    controller(controller: object): this;
    as(name: string): this;
    group(callback: () => void): void;
}
export type ResourceAction = 'index' | 'create' | 'store' | 'show' | 'edit' | 'update' | 'destroy';
export interface ResourceOptions {
    only?: ResourceAction[];
    except?: ResourceAction[];
    /** URL parameter name (default 'id') */
    param?: string;
    /** Request class per action: { store: StoreUserRequest, update: UpdateUserRequest } */
    requests?: Partial<Record<ResourceAction, RequestClass>>;
}
/** 'UserController@show' | 'authMiddleware' | 'Closure' (used by route:list) */
export declare function describeAction(handler: RouteHandler): string;
export declare const Route: {
    get: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    post: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    put: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    patch: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    delete: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    options: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    head: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    /** Respond to GET, POST, PUT, PATCH and DELETE. */
    any: <T extends object>(uri: string, handler: RouteAction<T>) => PendingRoute;
    /** Route.match(['get', 'post'], '/webhook', handler) */
    match: <T extends object>(methods: HttpMethod[], uri: string, handler: RouteAction<T>) => PendingRoute;
    /** Route.redirect('/old', '/new', 301) */
    redirect: (from: string, to: string, status?: number) => PendingRoute;
    permanentRedirect: (from: string, to: string) => PendingRoute;
    /** Route.group({ prefix: '/auth', middleware: ['auth'], as: 'auth.' }, () => { ... }) */
    group: (options: GroupOptions, callback: () => void) => void;
    controller: <T extends object>(controller: T) => GroupBuilder;
    /** Fluent groups: Route.prefix('/admin').middleware('auth').as('admin.').group(() => { ... }) */
    prefix: (prefix: string) => GroupBuilder;
    middleware: (...middleware: MiddlewareLike[]) => GroupBuilder;
    as: (name: string) => GroupBuilder;
    pattern: (param: string, pattern: RegExp) => /*elided*/ any;
    has: (name: string) => boolean;
    /**
     * Route.resource('users', usersController)
     *   index GET /users · store POST /users · show GET /users/{id}
     *   update PUT|PATCH /users/{id} · destroy DELETE /users/{id}
     * Actions the controller does not implement are skipped.
     */
    resource(name: string, controller: object, options?: ResourceOptions): PendingResource;
    apiResource(name: string, controller: object, options?: ResourceOptions): PendingResource;
    /**
     * Route.url('users.show', { id: 5 })            -> '/users/5'
     * Route.url('users.index', { page: 2 })         -> '/users?page=2'   (params not in the path become the query string)
     * Group prefixes are included, the mount path (like /api) is not.
     */
    url(name: string, params?: Record<string, string | number>): string;
    fallback: (handler?: HandlerFunction) => PendingRoute;
    /** Every declared route (used by route:list). */
    all: () => readonly RouteDefinition[];
    /** Build the Express router. Call it once, after all routes are declared: app.use('/api', Route.router()) */
    router(): Router;
    clear: () => void;
};
export default Route;
//# sourceMappingURL=Route.d.ts.map