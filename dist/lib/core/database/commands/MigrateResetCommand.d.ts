import { DatabaseCommand } from './DatabaseCommand.js';
export declare class MigrateResetCommand extends DatabaseCommand {
    readonly signature = "migrate:reset {--force : Run in production without asking}";
    readonly description = "Undo every migration (runs each down())";
    handle(): Promise<number>;
}
//# sourceMappingURL=MigrateResetCommand.d.ts.map