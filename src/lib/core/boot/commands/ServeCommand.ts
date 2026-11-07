import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CliError, Command } from '../../cli/index.js';
import type { Application } from '../Application.js';

export class ServeCommand extends Command {
  readonly signature =
    'serve {--port= : Port to listen on (default: PORT from .env)} {--file=src/bootstrap/app.ts : File that exports the Application}';
  readonly description = 'Start the HTTP server';

  async handle(): Promise<number | void> {
    const relative = this.option('file')!;
    const file = join(process.cwd(), relative);
    if (!existsSync(file)) throw new CliError(`Bootstrap file not found: ${relative}`);

    let port: number | undefined;
    const raw = this.option('port');
    if (raw !== undefined) {
      port = Number(raw);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new CliError('--port must be a number between 1 and 65535.');
    }

    const module = (await import(pathToFileURL(file).href)) as { app?: Application; default?: Application };
    const app = module.app ?? module.default;
    if (!app || typeof app.start !== 'function') {
      throw new CliError(`${relative} must export an Application: export const app = Application.create(...)`);
    }

    await app.start(port);
    await new Promise<void>(() => {});
    return 0;
  }
}
