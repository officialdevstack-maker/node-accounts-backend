// database/commands/DatabaseCommand.ts
// Shared behaviour for commands that touch the database: always close the connection, guard production.
import { Command } from '../../cli/index.js';
import { config } from '../../config/index.js';
import { Database } from '../Database.js';
export class DatabaseCommand extends Command {
    /** Pooled connections would keep the process alive, so close them whatever happens. */
    async run(argv, io) {
        try {
            return await super.run(argv, io);
        }
        finally {
            await Database.close();
        }
    }
    /**
     * Destructive commands call this first. In production it asks for confirmation (and answers "no" when
     * there is no terminal, so a CI script can't wipe a live database by accident). `--force` skips the question.
     */
    async confirmProduction() {
        if (config('app.env') !== 'production' || this.flag('force'))
            return true;
        this.warn('Application is in PRODUCTION.');
        const confirmed = await this.confirm('Do you really wish to run this command?', false);
        if (!confirmed)
            this.comment('Command cancelled.');
        return confirmed;
    }
}
//# sourceMappingURL=DatabaseCommand.js.map