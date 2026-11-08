import { Command } from '../../cli/index.js';
import type { Output } from '../../cli/index.js';
export declare abstract class DatabaseCommand extends Command {
    /** Pooled connections would keep the process alive, so close them whatever happens. */
    run(argv: string[], io: Output): Promise<number>;
    /**
     * Destructive commands call this first. In production it asks for confirmation (and answers "no" when
     * there is no terminal, so a CI script can't wipe a live database by accident). `--force` skips the question.
     */
    protected confirmProduction(): Promise<boolean>;
}
//# sourceMappingURL=DatabaseCommand.d.ts.map