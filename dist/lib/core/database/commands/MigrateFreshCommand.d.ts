import { DatabaseCommand } from './DatabaseCommand.js';
export declare class MigrateFreshCommand extends DatabaseCommand {
    readonly signature = "migrate:fresh {--seed : Run DatabaseSeeder afterwards} {--force : Run in production without asking}";
    readonly description = "DROP ALL TABLES, then run every migration again";
    handle(): Promise<number>;
}
//# sourceMappingURL=MigrateFreshCommand.d.ts.map