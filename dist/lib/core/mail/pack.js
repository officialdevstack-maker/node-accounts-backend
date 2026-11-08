// mail/pack.ts
// Found automatically by artisan (every <folder>/pack.ts next to cli/ is loaded). No registration needed.
import { definePack } from '../cli/index.js';
import { MailInfoCommand } from './commands/MailInfoCommand.js';
export default definePack({
    name: 'mail',
    description: 'Mail pack',
    commands: [MailInfoCommand],
});
//# sourceMappingURL=pack.js.map