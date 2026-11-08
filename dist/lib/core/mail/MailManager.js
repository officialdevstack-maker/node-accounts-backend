// mail/MailManager.ts
// Creates + caches nodemailer transports per mailer (like Laravel's MailManager).
import nodemailer, {} from 'nodemailer';
import mailConfig, {} from './config.js';
export class MailManager {
    static transports = new Map();
    static transporter(name = mailConfig.default) {
        const cached = this.transports.get(name);
        if (cached)
            return cached;
        let transporter;
        switch (name) {
            case 'smtp':
                transporter = nodemailer.createTransport({
                    ...mailConfig.mailers.smtp,
                    pool: true,
                });
                break;
            case 'log':
                // Builds the message but never sends it
                transporter = nodemailer.createTransport({ jsonTransport: true });
                break;
            default:
                throw new Error(`Mailer [${name}] is not defined in mail/config.ts`);
        }
        this.transports.set(name, transporter);
        return transporter;
    }
    static async deliver(options, name = mailConfig.default) {
        const info = await this.transporter(name).sendMail(options);
        if (name === 'log') {
            console.log('[mail:log]', info.message);
        }
        return info;
    }
    /** Check SMTP credentials/connection, handy on app boot. */
    static async verify(name = mailConfig.default) {
        if (name === 'log')
            return true;
        await this.transporter(name).verify();
        return true;
    }
}
//# sourceMappingURL=MailManager.js.map