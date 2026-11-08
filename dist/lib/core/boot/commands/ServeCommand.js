import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CliError, Command } from '../../cli/index.js';
export class ServeCommand extends Command {
    signature = 'serve {--port= : Port to listen on (default: PORT from .env)} {--file=src/bootstrap/app.ts : File that exports the Application}';
    description = 'Start the HTTP server';
    async handle() {
        const relative = this.option('file');
        const file = join(process.cwd(), relative);
        if (!existsSync(file))
            throw new CliError(`Bootstrap file not found: ${relative}`);
        let port;
        const raw = this.option('port');
        if (raw !== undefined) {
            port = Number(raw);
            if (!Number.isInteger(port) || port < 1 || port > 65535)
                throw new CliError('--port must be a number between 1 and 65535.');
        }
        const module = (await import(pathToFileURL(file).href));
        const app = module.app ?? module.default;
        if (!app || typeof app.start !== 'function') {
            throw new CliError(`${relative} must export an Application: export const app = Application.create(...)`);
        }
        await app.start(port);
        await new Promise(() => { });
        return 0;
    }
}
//# sourceMappingURL=ServeCommand.js.map