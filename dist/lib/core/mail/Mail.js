import mailConfig, {} from './config.js';
import { MailManager } from './MailManager.js';
import { MailQueue } from './MailQueue.js';
export class PendingMail {
    _to = [];
    _cc = [];
    _bcc = [];
    _mailer = mailConfig.default;
    to(recipient) {
        this._to.push(recipient);
        return this;
    }
    cc(recipient) {
        this._cc.push(recipient);
        return this;
    }
    bcc(recipient) {
        this._bcc.push(recipient);
        return this;
    }
    mailer(name) {
        this._mailer = name;
        return this;
    }
    /** Send immediately and wait for the result. */
    async send(mailable) {
        const options = await mailable.toMailOptions({ to: this._to, cc: this._cc, bcc: this._bcc });
        return MailManager.deliver(options, this._mailer);
    }
    /** Fire-and-forget with retries (does not block the request). */
    queue(mailable) {
        MailQueue.push(() => this.send(mailable));
    }
    /** Same as queue() but delayed. */
    later(delayMs, mailable) {
        MailQueue.push(() => this.send(mailable), delayMs);
    }
}
export const Mail = {
    to: (recipient) => new PendingMail().to(recipient),
    cc: (recipient) => new PendingMail().cc(recipient),
    bcc: (recipient) => new PendingMail().bcc(recipient),
    mailer: (name) => new PendingMail().mailer(name),
    /** Send a plain-text email without a Mailable class. */
    async raw(text, options) {
        return MailManager.deliver({
            from: { address: mailConfig.from.address, name: mailConfig.from.name },
            to: options.to,
            subject: options.subject,
            text,
        }, options.mailer ?? mailConfig.default);
    },
};
//# sourceMappingURL=Mail.js.map