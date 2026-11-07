// mail/mailables/WelcomeMail.ts
import type { User } from '../../../../models/User.js';
import { Mailable } from '../Mailable.js';
import mailConfig from '../config.js';
import { layout, paragraph, button, e } from '../views/layout.js';

export class WelcomeMail extends Mailable {
  constructor(private user: Pick<User, 'fullname'>) {
    super();
  }

  build(): void {
    const { name, url } = mailConfig.app;

    this.subject(`Welcome to ${name}`).html(
      layout({
        title: `Welcome, ${this.user.fullname}!`,
        preheader: `Your ${name} account is ready.`,
        body:
          paragraph(`Thanks for joining <strong>${e(name)}</strong>. Your account is ready to go.`) +
          button(url, 'Open your account') +
          paragraph('If you have any questions, just reply to this email.'),
      }),
    );
  }
}
