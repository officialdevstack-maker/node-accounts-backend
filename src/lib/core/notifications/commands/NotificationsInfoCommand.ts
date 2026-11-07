// notifications/commands/NotificationsInfoCommand.ts
import { Command } from '../../cli/index.js';

export class NotificationsInfoCommand extends Command {
  readonly signature = 'notifications:info';
  readonly description = 'Show information about the notifications pack';

  handle(): void {
    this.info('The notifications pack is registered.');
  }
}
