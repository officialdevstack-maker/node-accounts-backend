import { Command } from '../../cli/index.js';
export declare class LimiterListCommand extends Command {
    readonly signature = "limiter:list {--file=src/middleware/kernel.ts : File that imports your limiters (relative to the project root)}";
    readonly description = "List the named rate limiters and their limits";
    handle(): Promise<number>;
}
//# sourceMappingURL=LimiterListCommand.d.ts.map