// cli/commands/MakeNotificationCommand.ts
import { existsSync } from 'node:fs';
import { Command } from '../Command.js';
import { CliError } from '../Input.js';
import { mailableStub, notificationStub } from '../stubs.js';
import { addExport, appPath, className, displayPath, humanize, writeFileSafe } from '../support.js';

const CHANNELS = ['mail', 'database', 'sms'];

export class MakeNotificationCommand extends Command {
  readonly signature =
    'make:notification {name : Name, e.g. WalletDebitedNotification or wallet-debited} {--channels=mail,database : Comma separated: mail, database, sms} {--force : Overwrite if it exists}';
  readonly description = 'Create a Notification (and its Mailable when the mail channel is used)';

  async handle(): Promise<number> {
    const { full, stem } = className(this.argument('name')!, 'Notification');

    const channels = [...new Set(this.option('channels')!.split(',').map((c) => c.trim()).filter(Boolean))];
    const unknown = channels.filter((c) => !CHANNELS.includes(c));
    if (!channels.length || unknown.length) {
      throw new CliError(`--channels must be a list of: ${CHANNELS.join(', ')}${unknown.length ? ` (got: ${unknown.join(', ')})` : ''}`);
    }

    const force = this.flag('force');
    const title = humanize(stem);
    const file = appPath('notifications', 'messages', `${full}.ts`);

    // 1. the mailable the mail channel will send
    let mailable: string | undefined;
    if (channels.includes('mail')) {
      mailable = `${stem}Mail`;
      const mailFile = appPath('mail', 'mailables', `${mailable}.ts`);

      if (existsSync(mailFile)) {
        this.comment(`Using existing ${mailable} (check its constructor arguments).`);
      } else {
        await writeFileSafe(mailFile, mailableStub(mailable, title));
        this.success(`${mailable} created: ${displayPath(mailFile)}`);
        await addExport(appPath('mail', 'index.ts'), `export { ${mailable} } from './mailables/${mailable}.js';`);
      }
    }

    // 2. the notification
    const result = await writeFileSafe(file, notificationStub({ cls: full, title, channels, mailable }), force);
    if (result === 'exists') {
      this.error(`${displayPath(file)} already exists. Use --force to overwrite.`);
      return 1;
    }

    this.success(`${full} ${result}: ${displayPath(file)}`);

    if (await addExport(appPath('notifications', 'index.ts'), `export { ${full} } from './messages/${full}.js';`)) {
      this.comment('Exported from notifications/index.ts');
    }
    return 0;
  }
}
