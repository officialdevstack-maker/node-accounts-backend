// notifications/commands/NotificationsInfoCommand.ts
import { Command } from '../../cli/index.js';
export class NotificationsInfoCommand extends Command {
    signature = 'notifications:info';
    description = 'Show information about the notifications pack';
    handle() {
        this.info('The notifications pack is registered.');
    }
}
//# sourceMappingURL=NotificationsInfoCommand.js.map