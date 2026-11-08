import { Command } from '../Command.js';
export declare class MakePackCommand extends Command {
    readonly signature = "make:pack {name : Folder name, e.g. billing} {--description= : One line description} {--force : Overwrite files that already exist}";
    readonly description = "Create a pack folder that artisan discovers automatically (pack.ts + commands/)";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakePackCommand.d.ts.map