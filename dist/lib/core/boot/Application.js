import express, {} from 'express';
import { config } from '../config/index.js';
/** Order matters: middleware must exist before routes, error handlers must come after them. */
const PHASES = ['register', 'middleware', 'routes', 'errors', 'boot'];
const SIGNALS = ['SIGINT', 'SIGTERM'];
export class Application {
    /** The underlying Express app. Providers add middleware and routes to it. */
    express = express();
    providers = [];
    booting;
    server;
    static create(...providers) {
        return new Application().register(...providers);
    }
    /** Add providers. Must be done before bootstrap() / start(). */
    register(...classes) {
        if (this.booting)
            throw new Error('Cannot register providers after the application has been bootstrapped.');
        for (const Class of classes)
            this.providers.push(new Class(this));
        return this;
    }
    /**
     * Run every phase without listening. Safe to call more than once.
     * Useful for tests (supertest(await app.bootstrap())) and scripts.
     */
    bootstrap() {
        this.booting ??= this.runPhases().then(() => this.express);
        return this.booting;
    }
    /** Bootstrap, then listen. Registers SIGINT/SIGTERM handlers for a graceful shutdown. */
    async start(port = config('app.port')) {
        await this.bootstrap();
        const server = await new Promise((resolve, reject) => {
            const listener = this.express.listen(port, (error) => {
                if (error)
                    reject(error);
                else
                    resolve(listener);
            });
        });
        this.server = server;
        console.log(`Backend server is running on port ${port}`);
        for (const signal of SIGNALS)
            process.once(signal, () => void this.exitGracefully(signal));
        return server;
    }
    /** start() with the "log and exit(1)" handling that server.ts needs. */
    async run(port) {
        try {
            await this.start(port);
        }
        catch (error) {
            console.error('Unable to start server:', error);
            process.exit(1);
        }
    }
    /** Stop accepting connections, then run every provider's shutdown() (reverse order). */
    async stop() {
        const server = this.server;
        this.server = undefined;
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error)
                        reject(error);
                    else
                        resolve();
                });
            });
        }
        for (const provider of [...this.providers].reverse()) {
            try {
                await provider.shutdown?.();
            }
            catch (error) {
                console.error(`[boot] ${provider.constructor.name}.shutdown() failed:`, error);
            }
        }
    }
    async runPhases() {
        for (const hook of PHASES) {
            for (const provider of this.providers) {
                await provider[hook]?.();
            }
        }
    }
    async exitGracefully(signal) {
        console.log(`\n${signal} received, shutting down ...`);
        setTimeout(() => process.exit(1), 10_000).unref();
        await this.stop();
        process.exit(0);
    }
}
//# sourceMappingURL=Application.js.map