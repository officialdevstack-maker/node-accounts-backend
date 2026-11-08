import { Command } from '../Command.js';
export declare class MakeCommandCommand extends Command {
    readonly signature = "make:command {name : Class name, e.g. SendReports} {--command= : Command name (default app:<kebab-name>)} {--force : Overwrite if it exists}";
    readonly description = "Create a new artisan command in commands/";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeCommandCommand.d.ts.map