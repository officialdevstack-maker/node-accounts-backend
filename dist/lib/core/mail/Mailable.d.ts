import type { SendMailOptions } from 'nodemailer';
import type { Address, MailAttachment, MailPriority, Recipient } from './types.js';
export declare abstract class Mailable {
    protected _subject: string;
    protected _html: string;
    protected _text: string;
    protected _from?: Address;
    protected _replyTo?: Recipient;
    protected _to: Recipient[];
    protected _cc: Recipient[];
    protected _bcc: Recipient[];
    protected _attachments: MailAttachment[];
    protected _headers: Record<string, string>;
    protected _priority?: MailPriority;
    /** Define the message here using the fluent methods below. */
    abstract build(): void | Promise<void>;
    subject(subject: string): this;
    /** Pass a rendered HTML string (see mail/views). A text version is generated if you don't set one. */
    html(html: string): this;
    text(text: string): this;
    from(address: string, name?: string): this;
    replyTo(recipient: Recipient): this;
    to(recipient: Recipient): this;
    cc(recipient: Recipient): this;
    bcc(recipient: Recipient): this;
    attach(attachment: MailAttachment): this;
    withHeader(key: string, value: string): this;
    priority(priority: MailPriority): this;
    /** Called by Mail facade: runs build() and returns nodemailer options. */
    toMailOptions(extra?: {
        to?: Recipient[];
        cc?: Recipient[];
        bcc?: Recipient[];
    }): Promise<SendMailOptions>;
    private static htmlToText;
}
//# sourceMappingURL=Mailable.d.ts.map