// cli/commands/MailVerifyCommand.ts
import { Command } from '../Command.js';
import { CliError } from '../Input.js';
export class MailVerifyCommand extends Command {
    signature = 'mail:verify {--mailer= : smtp or log (default: MAIL_MAILER)}';
    description = 'Check the SMTP connection and credentials';
    async handle() {
        const { MailManager, mailConfig } = await import('../../mail/index.js');
        const mailer = (this.option('mailer') ?? mailConfig.default);
        if (mailer !== 'smtp' && mailer !== 'log')
            throw new CliError('--mailer must be "smtp" or "log".');
        if (mailer === 'smtp') {
            const { host, port, secure, auth } = mailConfig.mailers.smtp;
            this.comment(`Connecting to ${host}:${port} (${secure ? 'ssl' : 'starttls'}) as ${auth?.user ?? 'anonymous'} ...`);
        }
        try {
            await MailManager.verify(mailer);
            this.success(`Mailer [${mailer}] is ready.`);
            return 0;
        }
        catch (error) {
            this.error(`Mailer [${mailer}] failed: ${error instanceof Error ? error.message : String(error)}`);
            return 1;
        }
    }
}
//# sourceMappingURL=MailVerifyCommand.js.map