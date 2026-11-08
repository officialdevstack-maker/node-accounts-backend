import { Command } from '../Command.js';
export declare class MakeMailCommand extends Command {
    readonly signature = "make:mail {name : Name of the mailable, e.g. InvoiceMail or invoice} {--force : Overwrite if it exists}";
    readonly description = "Create a new Mailable class in mail/mailables";
    handle(): Promise<number>;
}
//# sourceMappingURL=MakeMailCommand.d.ts.map