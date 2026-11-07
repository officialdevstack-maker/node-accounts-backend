// notifications/messages/WelcomeNotification.ts
import { WelcomeMail } from '../../mail/index.js';
import { Notification } from '../Notification.js';
import type { ChannelName, Notifiable } from '../types.js';

export class WelcomeNotification extends Notification {
  constructor(private name: string) {
    super();
  }

  via(): ChannelName[] {
    return ['mail', 'database'];
  }

  toMail(notifiable: Notifiable) {
    return new WelcomeMail({
      fullname: this.name,
    });
  }
  

  toDatabase() {
    return { title: 'Welcome!', body: `Thanks for joining, ${this.name}.` };
  }
}
