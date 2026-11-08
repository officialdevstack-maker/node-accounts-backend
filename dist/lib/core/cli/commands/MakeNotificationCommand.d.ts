import { Command } from '../Command.js';
export declare class MakeNotificationCommand extends Command {
    readonly signature = "make:notification {name : Name, e.g. WalletDebitedNotification or wallet-debited} {--channels=mail,database : Comma separated: mail, database, sms} {--force : Overwrite if it exists}";
    readonly description = "Create a Notification (and its Mailable when the mail channel is used)";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeNotificationCommand.d.ts.map