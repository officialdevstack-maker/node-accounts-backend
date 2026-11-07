// mail/mailables/WelcomeHeresMail.ts
import { Mailable } from '../Mailable.js';
import { layout, paragraph } from '../views/layout.js';

export class WelcomeHeresMail extends Mailable {
  // constructor(private name: string) { super(); }

  build(): void {
    this.subject('Welcome heres').html(
      layout({
        title: 'Welcome heres',
        preheader: '',
        body: paragraph('Write your message here.'),
      }),
    );
  }
}
