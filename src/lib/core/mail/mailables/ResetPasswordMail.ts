// mail/mailables/ResetPasswordMail.ts
import type { User } from '../../../../models/User.js';
import { Mailable } from '../Mailable.js';
import { layout, paragraph, button, e } from '../views/layout.js';

export class ResetPasswordMail extends Mailable {
  constructor(
    private user: Pick<User, 'fullname'>,
    private resetUrl: string,
    private expiresInMinutes = 60,
  ) {
    super();
  }

  build(): void {
    this.subject('Reset your password').html(
      layout({
        title: 'Reset your password',
        preheader: 'You requested a password reset.',
        body:
          paragraph(`Hi ${e(this.user.fullname)}, we received a request to reset your password.`) +
          button(this.resetUrl, 'Reset password') +
          paragraph(`This link expires in ${this.expiresInMinutes} minutes.`) +
          paragraph('If you did not request a password reset, you can safely ignore this email.'),
      }),
    );
  }
}
