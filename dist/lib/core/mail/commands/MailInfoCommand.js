// mail/commands/MailInfoCommand.ts
import { Command } from '../../cli/index.js';
export class MailInfoCommand extends Command {
    signature = 'mail:info';
    description = 'Show information about the mail pack';
    handle() {
        this.info('The mail pack is registered.');
    }
}
//# sourceMappingURL=MailInfoCommand.js.map