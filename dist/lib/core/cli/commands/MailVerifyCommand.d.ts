import { Command } from '../Command.js';
export declare class MailVerifyCommand extends Command {
    readonly signature = "mail:verify {--mailer= : smtp or log (default: MAIL_MAILER)}";
    readonly description = "Check the SMTP connection and credentials";
    handle(): Promise<number>;
}
//# sourceMappingURL=MailVerifyCommand.d.ts.map