import { Command } from '../../cli/index.js';
export declare class MakeProviderCommand extends Command {
    readonly signature = "make:provider {name : e.g. Queue or QueueServiceProvider} {--force : Overwrite if it exists}";
    readonly description = "Create a service provider in src/providers";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeProviderCommand.d.ts.map