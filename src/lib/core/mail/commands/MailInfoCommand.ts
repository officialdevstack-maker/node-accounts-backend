// mail/commands/MailInfoCommand.ts
import { Command } from '../../cli/index.js';

export class MailInfoCommand extends Command {
  readonly signature = 'mail:info';
  readonly description = 'Show information about the mail pack';

  handle(): void {
    this.info('The mail pack is registered.');
  }
}
