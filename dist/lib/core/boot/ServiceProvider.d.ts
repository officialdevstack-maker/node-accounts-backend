import type { Application } from './Application.js';
export type ProviderHook = 'register' | 'middleware' | 'routes' | 'errors' | 'boot' | 'shutdown';
export declare abstract class ServiceProvider {
    protected readonly app: Application;
    constructor(app: Application);
    /** 1. Set things up: init models, read config. Nothing is listening yet. */
    register?(): void | Promise<void>;
    /** 2. Global middleware, in provider order (cors, body parsers, auth ...). */
    middleware?(): void | Promise<void>;
    /** 3. Mount routes. Runs after every provider's middleware. */
    routes?(): void | Promise<void>;
    /** 4. Error handlers (404, error handler). Runs after every route is mounted. */
    errors?(): void | Promise<void>;
    /** 5. Connect to things (database, cache). Runs just before the server listens. */
    boot?(): void | Promise<void>;
    /** On SIGINT / SIGTERM, in reverse provider order: close connections. */
    shutdown?(): void | Promise<void>;
}
export type ProviderClass = new (app: Application) => ServiceProvider;
//# sourceMappingURL=ServiceProvider.d.ts.map