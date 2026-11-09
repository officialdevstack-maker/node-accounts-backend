// mail/MailManager.ts
// Creates + caches nodemailer transports per mailer (like Laravel's MailManager).
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';
import mailConfig, { type MailerName } from './config.js';

export class MailManager {
  private static transports = new Map<MailerName, Transporter>();

  static transporter(name: MailerName = mailConfig.default): Transporter {
    const cached = this.transports.get(name);
    if (cached) return cached;

    let transporter: Transporter;

    switch (name) {
      case 'smtp':
        transporter = nodemailer.createTransport({
          ...mailConfig.mailers.smtp,
          pool: true,
          connectionTimeout: 15_000,
          greetingTimeout: 15_000,
          socketTimeout: 30_000,
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

  static async deliver(options: SendMailOptions, name: MailerName = mailConfig.default) {
    const info = await this.transporter(name).sendMail(options);

    if (name === 'log') {
      console.log('[mail:log]', info.message);
    }

    return info;
  }

  /** Check SMTP credentials/connection, handy on app boot. */
  static async verify(name: MailerName = mailConfig.default): Promise<boolean> {
    if (name === 'log') return true;
    await this.transporter(name).verify();
    return true;
  }
}
