import { type SendMailOptions, type Transporter } from 'nodemailer';
import { type MailerName } from './config.js';
export declare class MailManager {
    private static transports;
    static transporter(name?: MailerName): Transporter;
    static deliver(options: SendMailOptions, name?: MailerName): Promise<import("nodemailer").SentMessageInfo>;
    /** Check SMTP credentials/connection, handy on app boot. */
    static verify(name?: MailerName): Promise<boolean>;
}
//# sourceMappingURL=MailManager.d.ts.map