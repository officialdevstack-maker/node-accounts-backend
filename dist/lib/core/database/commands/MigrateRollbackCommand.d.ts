import { DatabaseCommand } from './DatabaseCommand.js';
export declare class MigrateRollbackCommand extends DatabaseCommand {
    readonly signature = "migrate:rollback {--step= : Number of migrations to undo (default: the whole last batch)} {--force : Run in production without asking}";
    readonly description = "Undo the last batch of migrations";
    handle(): Promise<number>;
}
//# sourceMappingURL=MigrateRollbackCommand.d.ts.map