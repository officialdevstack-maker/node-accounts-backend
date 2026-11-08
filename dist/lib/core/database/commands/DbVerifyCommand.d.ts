import { DatabaseCommand } from './DatabaseCommand.js';
export declare class DbVerifyCommand extends DatabaseCommand {
    readonly signature = "db:verify";
    readonly description = "Check the database connection and credentials";
    handle(): Promise<number>;
}
//# sourceMappingURL=DbVerifyCommand.d.ts.map