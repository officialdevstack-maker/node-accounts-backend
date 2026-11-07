// cli/commands/MailTestCommand.ts
import { Command } from '../Command.js';
import { CliError } from '../Input.js';

export class MailTestCommand extends Command {
  readonly signature = 'mail:test {to : Recipient address} {--mailer= : smtp or log (default: MAIL_MAILER)} {--subject=Test email : Subject line}';
  readonly description = 'Send a plain test email through the mail pack';

  async handle(): Promise<number> {
    const { Mail, mailConfig } = await import('../../mail/index.js');

    const to = this.argument('to')!;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new CliError(`"${to}" is not a valid email address.`);

    const mailer = (this.option('mailer') ?? mailConfig.default) as 'smtp' | 'log';
    if (mailer !== 'smtp' && mailer !== 'log') throw new CliError('--mailer must be "smtp" or "log".');

    this.comment(`Sending via [${mailer}] to ${to} ...`);

    const info = await Mail.raw(`This is a test email from ${mailConfig.app.name}, sent at ${new Date().toISOString()}.`, {
      to,
      subject: this.option('subject') ?? 'Test email',
      mailer,
    });

    this.success(mailer === 'log' ? 'Message built (log mailer, nothing was actually sent).' : `Sent. Message id: ${info.messageId}`);
    return 0;
  }
}
