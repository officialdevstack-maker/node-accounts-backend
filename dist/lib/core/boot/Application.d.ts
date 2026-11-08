import { type Express } from 'express';
import type { Server } from 'node:http';
import type { ProviderClass } from './ServiceProvider.js';
export declare class Application {
    /** The underlying Express app. Providers add middleware and routes to it. */
    readonly express: Express;
    private readonly providers;
    private booting;
    private server;
    static create(...providers: ProviderClass[]): Application;
    /** Add providers. Must be done before bootstrap() / start(). */
    register(...classes: ProviderClass[]): this;
    /**
     * Run every phase without listening. Safe to call more than once.
     * Useful for tests (supertest(await app.bootstrap())) and scripts.
     */
    bootstrap(): Promise<Express>;
    /** Bootstrap, then listen. Registers SIGINT/SIGTERM handlers for a graceful shutdown. */
    start(port?: number): Promise<Server>;
    /** start() with the "log and exit(1)" handling that server.ts needs. */
    run(port?: number): Promise<void>;
    /** Stop accepting connections, then run every provider's shutdown() (reverse order). */
    stop(): Promise<void>;
    private runPhases;
    private exitGracefully;
}
//# sourceMappingURL=Application.d.ts.map