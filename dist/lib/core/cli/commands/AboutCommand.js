// cli/commands/AboutCommand.ts
// Never prints secrets, only non-sensitive settings.
import { Command } from '../Command.js';
export class AboutCommand extends Command {
    signature = 'about';
    description = 'Show basic information about the application';
    async handle() {
        const { config } = await import('../../config/index.js');
        this.title('Environment');
        this.io.definitionList([
            ['Application', config('app.name')],
            ['Environment', config('app.env')],
            ['Debug', config('app.debug') ? 'ENABLED' : 'OFF'],
            ['URL', config('app.url')],
            ['Timezone', config('app.timezone')],
            ['Node', process.version],
        ]);
        this.title('Drivers');
        this.io.definitionList([
            ['Database', `${config('database.default')} @ ${config('database.host')}:${config('database.port')}/${config('database.name')}`],
            ['Mail', `${config('mail.default')} (${config('mail.mailers.smtp.host')}:${config('mail.mailers.smtp.port')})`],
            ['Queue', config('queue.driver')],
            ['SMS', config('notifications.sms.driver')],
        ]);
        this.newLine();
    }
}
//# sourceMappingURL=AboutCommand.js.map