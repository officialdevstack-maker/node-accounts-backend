import { Command } from '../Command.js';
export declare class MailTestCommand extends Command {
    readonly signature = "mail:test {to : Recipient address} {--mailer= : smtp or log (default: MAIL_MAILER)} {--subject=Test email : Subject line}";
    readonly description = "Send a plain test email through the mail pack";
    handle(): Promise<number>;
}
//# sourceMappingURL=MailTestCommand.d.ts.map