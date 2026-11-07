// mail/mailables/OtpMail.ts
import { Mailable } from '../Mailable.js';
import { layout, paragraph, codeBox } from '../views/layout.js';

export class OtpMail extends Mailable {
  constructor(
    private code: string,
    private expiresInMinutes = 10,
  ) {
    super();
  }

  build(): void {
    this.subject(`Your verification code: ${this.code}`)
      .priority('high')
      .html(
        layout({
          title: 'Your verification code',
          preheader: `Your code is ${this.code}`,
          body:
            paragraph('Use the code below to continue. Never share it with anyone.') +
            codeBox(this.code) +
            paragraph(`This code expires in ${this.expiresInMinutes} minutes.`),
        }),
      );
  }
}
