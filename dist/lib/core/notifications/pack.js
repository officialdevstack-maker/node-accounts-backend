// notifications/pack.ts
// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { NotificationsInfoCommand } from './commands/NotificationsInfoCommand.js';
export default definePack({
    name: 'notifications',
    description: 'Notifications pack',
    commands: [NotificationsInfoCommand],
});
//# sourceMappingURL=pack.js.map