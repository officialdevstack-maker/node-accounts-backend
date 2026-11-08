import { DatabaseCommand } from '../../database/commands/DatabaseCommand.js';
export declare class DbTableCommand extends DatabaseCommand {
    readonly signature = "db:table {table : Table name} {--limit=10 : Rows to show}";
    readonly description = "Show the row count and the first rows of a table (secrets are masked)";
    handle(): Promise<number>;
}
//# sourceMappingURL=DbTableCommand.d.ts.map