import mailConfig from './config.js';
export class Mailable {
    _subject = '';
    _html = '';
    _text = '';
    _from;
    _replyTo;
    _to = [];
    _cc = [];
    _bcc = [];
    _attachments = [];
    _headers = {};
    _priority;
    // ---- fluent API -------------------------------------------------------
    subject(subject) {
        this._subject = subject;
        return this;
    }
    /** Pass a rendered HTML string (see mail/views). A text version is generated if you don't set one. */
    html(html) {
        this._html = html;
        return this;
    }
    text(text) {
        this._text = text;
        return this;
    }
    from(address, name) {
        this._from = { address, ...(name ? { name } : {}) };
        return this;
    }
    replyTo(recipient) {
        this._replyTo = recipient;
        return this;
    }
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
    attach(attachment) {
        this._attachments.push(attachment);
        return this;
    }
    withHeader(key, value) {
        this._headers[key] = value;
        return this;
    }
    priority(priority) {
        this._priority = priority;
        return this;
    }
    // ---- internals --------------------------------------------------------
    /** Called by Mail facade: runs build() and returns nodemailer options. */
    async toMailOptions(extra = {}) {
        await this.build();
        const from = this._from ?? mailConfig.from;
        return {
            from: { address: from.address, name: from.name ?? '' },
            to: [...(extra.to ?? []), ...this._to].flat(),
            cc: [...(extra.cc ?? []), ...this._cc].flat(),
            bcc: [...(extra.bcc ?? []), ...this._bcc].flat(),
            replyTo: this._replyTo,
            subject: this._subject,
            html: this._html || undefined,
            text: this._text || (this._html ? Mailable.htmlToText(this._html) : undefined),
            attachments: this._attachments,
            headers: this._headers,
            priority: this._priority,
        };
    }
    static htmlToText(html) {
        return html
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|h[1-6]|tr|li)>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
}
//# sourceMappingURL=Mailable.js.map