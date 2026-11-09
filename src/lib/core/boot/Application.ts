import express, { type Express } from 'express';
import type { Server } from 'node:http';
import { config } from '../config/index.js';
import type { ProviderClass, ProviderHook, ServiceProvider } from './ServiceProvider.js';

/** Order matters: middleware must exist before routes, error handlers must come after them. */
const PHASES: ProviderHook[] = ['register', 'middleware', 'routes', 'errors', 'boot'];
const SIGNALS = ['SIGINT', 'SIGTERM'] as const;

export class Application {
  /** The underlying Express app. Providers add middleware and routes to it. */
  readonly express: Express = express();

  private readonly providers: ServiceProvider[] = [];
  private booting: Promise<Express> | undefined;
  private server: Server | undefined;

  static create(...providers: ProviderClass[]): Application {
    return new Application().register(...providers);
  }

  /** Add providers. Must be done before bootstrap() / start(). */
  register(...classes: ProviderClass[]): this {
    if (this.booting) throw new Error('Cannot register providers after the application has been bootstrapped.');

    for (const Class of classes) this.providers.push(new Class(this));
    return this;
  }

  /**
   * Run every phase without listening. Safe to call more than once.
   * Useful for tests (supertest(await app.bootstrap())) and scripts.
   */
  bootstrap(): Promise<Express> {
    this.booting ??= this.runPhases().then(() => this.express);
    return this.booting;
  }

  /** Bootstrap, then listen. Registers SIGINT/SIGTERM handlers for a graceful shutdown. */
  async start(port: number = config('app.port')): Promise<Server> {
    await this.bootstrap();

    const server = this.express.listen(port, '0.0.0.0');
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off('listening', onListening);
        reject(error);
      };
      const onListening = () => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
    });

    this.server = server;
    console.log(`Backend server is running on port ${port}`);

    for (const signal of SIGNALS) process.once(signal, () => void this.exitGracefully(signal));
    return server;
  }

  /** start() with the "log and exit(1)" handling that server.ts needs. */
  async run(port?: number): Promise<void> {
    try {
      await this.start(port);
    } catch (error) {
      console.error('Unable to start server:', error);
      process.exit(1);
    }
  }

  /** Stop accepting connections, then run every provider's shutdown() (reverse order). */
  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;

    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    for (const provider of [...this.providers].reverse()) {
      try {
        await provider.shutdown?.();
      } catch (error) {
        console.error(`[boot] ${provider.constructor.name}.shutdown() failed:`, error);
      }
    }
  }

  private async runPhases(): Promise<void> {
    for (const hook of PHASES) {
      for (const provider of this.providers) {
        await provider[hook]?.();
      }
    }
  }

  private async exitGracefully(signal: string): Promise<void> {
    console.log(`\n${signal} received, shutting down ...`);
    setTimeout(() => process.exit(1), 10_000).unref();
    await this.stop();
    process.exit(0);
  }
}
