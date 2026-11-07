// mail/Mailable.ts
// Base class for every email, like Illuminate\Mail\Mailable.
import type { SendMailOptions } from 'nodemailer';
import mailConfig from './config.js';
import type { Address, MailAttachment, MailPriority, Recipient } from './types.js';

export abstract class Mailable {
  protected _subject = '';
  protected _html = '';
  protected _text = '';
  protected _from?: Address;
  protected _replyTo?: Recipient;
  protected _to: Recipient[] = [];
  protected _cc: Recipient[] = [];
  protected _bcc: Recipient[] = [];
  protected _attachments: MailAttachment[] = [];
  protected _headers: Record<string, string> = {};
  protected _priority?: MailPriority;

  /** Define the message here using the fluent methods below. */
  abstract build(): void | Promise<void>;

  // ---- fluent API -------------------------------------------------------
  subject(subject: string): this {
    this._subject = subject;
    return this;
  }

  /** Pass a rendered HTML string (see mail/views). A text version is generated if you don't set one. */
  html(html: string): this {
    this._html = html;
    return this;
  }

  text(text: string): this {
    this._text = text;
    return this;
  }

  from(address: string, name?: string): this {
    this._from = { address, ...(name ? { name } : {}) };
    return this;
  }

  replyTo(recipient: Recipient): this {
    this._replyTo = recipient;
    return this;
  }

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

  attach(attachment: MailAttachment): this {
    this._attachments.push(attachment);
    return this;
  }

  withHeader(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  priority(priority: MailPriority): this {
    this._priority = priority;
    return this;
  }

  // ---- internals --------------------------------------------------------
  /** Called by Mail facade: runs build() and returns nodemailer options. */
  async toMailOptions(extra: { to?: Recipient[]; cc?: Recipient[]; bcc?: Recipient[] } = {}): Promise<SendMailOptions> {
    await this.build();

    const from = this._from ?? mailConfig.from;

    return {
      from: { address: from.address, name: from.name ?? '' },
      to: [...(extra.to ?? []), ...this._to].flat() as SendMailOptions['to'],
      cc: [...(extra.cc ?? []), ...this._cc].flat() as SendMailOptions['cc'],
      bcc: [...(extra.bcc ?? []), ...this._bcc].flat() as SendMailOptions['bcc'],
      replyTo: this._replyTo as SendMailOptions['replyTo'],
      subject: this._subject,
      html: this._html || undefined,
      text: this._text || (this._html ? Mailable.htmlToText(this._html) : undefined),
      attachments: this._attachments,
      headers: this._headers,
      priority: this._priority,
    };
  }

  private static htmlToText(html: string): string {
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
