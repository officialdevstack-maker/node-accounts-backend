import type { SendMailOptions } from 'nodemailer';
import { type MailerName } from './config.js';
import type { Mailable } from './Mailable.js';
import type { Recipient } from './types.js';
export declare class PendingMail {
    private _to;
    private _cc;
    private _bcc;
    private _mailer;
    to(recipient: Recipient): this;
    cc(recipient: Recipient): this;
    bcc(recipient: Recipient): this;
    mailer(name: MailerName): this;
    /** Send immediately and wait for the result. */
    send(mailable: Mailable): Promise<import("nodemailer").SentMessageInfo>;
    /** Fire-and-forget with retries (does not block the request). */
    queue(mailable: Mailable): void;
    /** Same as queue() but delayed. */
    later(delayMs: number, mailable: Mailable): void;
}
export declare const Mail: {
    to: (recipient: Recipient) => PendingMail;
    cc: (recipient: Recipient) => PendingMail;
    bcc: (recipient: Recipient) => PendingMail;
    mailer: (name: MailerName) => PendingMail;
    /** Send a plain-text email without a Mailable class. */
    raw(text: string, options: Pick<SendMailOptions, "to" | "subject"> & {
        mailer?: MailerName;
    }): Promise<import("nodemailer").SentMessageInfo>;
};
//# sourceMappingURL=Mail.d.ts.map