import type { User } from '../../../../models/User.js';
import { config } from '../../config/index.js';
import { Mailable } from '../Mailable.js';
import mailConfig from '../config.js';
import { button, e, layout, paragraph } from '../views/layout.js';

export class LoginAlertMail extends Mailable {
  constructor(
    private user: Pick<User, 'fullname'>,
    private device: string,
    private ip: string | null,
    private at: Date,
    private newDevice = false,
  ) {
    super();
  }

  build(): void {
    const { name } = mailConfig.app;
    const when = new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: config('app.timezone'),
    }).format(this.at);

    this.subject(`New sign-in to your ${name} account`).html(
      layout({
        title: 'You just signed in',
        preheader: `${this.device} signed in to your account.`,
        body:
          paragraph(`Hi ${e(this.user.fullname)}, your account was just signed in.`) +
          (this.newDevice ? paragraph('<strong>This is a device we haven’t seen before.</strong>') : '') +
          paragraph(
            `<strong>Device:</strong> ${e(this.device)}<br>` +
              `<strong>IP address:</strong> ${e(this.ip ?? 'Unknown')}<br>` +
              `<strong>Time:</strong> ${e(when)}`,
          ) +
          paragraph('If this was you, no action is needed. If not, change your password and sign out your other devices right away.') +
          button(`${config('app.frontendUrl')}/profile#security`, 'Review your devices') +
          paragraph('You can turn these alerts off in your account security settings.'),
      }),
    );
  }
}
