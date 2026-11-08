import { DatabaseCommand } from './DatabaseCommand.js';
export declare class MigrateCommand extends DatabaseCommand {
    readonly signature = "migrate {--step : Give each migration its own batch (rollback then undoes one at a time)} {--force : Run in production without asking}";
    readonly description = "Run the pending database migrations";
    handle(): Promise<number>;
}
//# sourceMappingURL=MigrateCommand.d.ts.map