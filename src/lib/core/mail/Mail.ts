// mail/Mail.ts
// The facade: Mail.to('a@b.com').send(new WelcomeMail(user))
import type { SendMailOptions } from 'nodemailer';
import mailConfig, { type MailerName } from './config.js';
import { MailManager } from './MailManager.js';
import { MailQueue } from './MailQueue.js';
import type { Mailable } from './Mailable.js';
import type { Recipient } from './types.js';

export class PendingMail {
  private _to: Recipient[] = [];
  private _cc: Recipient[] = [];
  private _bcc: Recipient[] = [];
  private _mailer: MailerName = mailConfig.default;

  to(recipient: Recipient): this {
    this._to.push(recipient);
    return this;
  }

  cc(recipient: Recipient): this {
    this._cc.push(recipient);
    return this;
  }

  bcc(recipient: Recipient): this {
    this._bcc.push(recipient);
    return this;
  }

  mailer(name: MailerName): this {
    this._mailer = name;
    return this;
  }

  /** Send immediately and wait for the result. */
  async send(mailable: Mailable) {
    const options = await mailable.toMailOptions({ to: this._to, cc: this._cc, bcc: this._bcc });
    return MailManager.deliver(options, this._mailer);
  }

  /** Fire-and-forget with retries (does not block the request). */
  queue(mailable: Mailable): void {
    void this.enqueue(mailable);
  }

  /** Same as queue() but delayed. */
  later(delayMs: number, mailable: Mailable): void {
    void this.enqueue(mailable, delayMs);
  }

  private async enqueue(mailable: Mailable, delayMs = 0): Promise<void> {
    try {
      const options = await mailable.toMailOptions({ to: this._to, cc: this._cc, bcc: this._bcc });
      await MailQueue.pushMail(options, this._mailer, delayMs);
    } catch (error) {
      console.error('[mail:queue] could not enqueue message', error);
    }
  }
}

export const Mail = {
  to: (recipient: Recipient) => new PendingMail().to(recipient),
  cc: (recipient: Recipient) => new PendingMail().cc(recipient),
  bcc: (recipient: Recipient) => new PendingMail().bcc(recipient),
  mailer: (name: MailerName) => new PendingMail().mailer(name),

  /** Send a plain-text email without a Mailable class. */
  async raw(text: string, options: Pick<SendMailOptions, 'to' | 'subject'> & { mailer?: MailerName }) {
    return MailManager.deliver(
      {
        from: { address: mailConfig.from.address, name: mailConfig.from.name },
        to: options.to,
        subject: options.subject,
        text,
      },
      options.mailer ?? mailConfig.default,
    );
  },
};
