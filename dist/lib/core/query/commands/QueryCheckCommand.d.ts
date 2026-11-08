import { DatabaseCommand } from '../../database/commands/DatabaseCommand.js';
export declare class QueryCheckCommand extends DatabaseCommand {
    readonly signature = "query:check";
    readonly description = "Run the query builder against the database (uses a temporary table)";
    handle(): Promise<number>;
}
//# sourceMappingURL=QueryCheckCommand.d.ts.map