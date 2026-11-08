import type { SendMailOptions } from 'nodemailer';
export interface Address {
    address: string;
    name?: string;
}
/** "a@b.com" | { address, name } | an array of either */
export type Recipient = string | Address | Array<string | Address>;
export type MailAttachment = NonNullable<SendMailOptions['attachments']>[number];
export type MailPriority = 'high' | 'normal' | 'low';
//# sourceMappingURL=types.d.ts.map