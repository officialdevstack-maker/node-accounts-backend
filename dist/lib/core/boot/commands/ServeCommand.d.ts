import { Command } from '../../cli/index.js';
export declare class ServeCommand extends Command {
    readonly signature = "serve {--port= : Port to listen on (default: PORT from .env)} {--file=src/bootstrap/app.ts : File that exports the Application}";
    readonly description = "Start the HTTP server";
    handle(): Promise<number | void>;
}
//# sourceMappingURL=ServeCommand.d.ts.map