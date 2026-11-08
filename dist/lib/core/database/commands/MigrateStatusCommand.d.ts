import { DatabaseCommand } from './DatabaseCommand.js';
export declare class MigrateStatusCommand extends DatabaseCommand {
    readonly signature = "migrate:status";
    readonly description = "Show which migrations have run";
    handle(): Promise<number>;
}
//# sourceMappingURL=MigrateStatusCommand.d.ts.map