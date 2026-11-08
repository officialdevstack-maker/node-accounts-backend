// notifications/messages/WelcomeNotification.ts
import { WelcomeMail } from '../../mail/index.js';
import { Notification } from '../Notification.js';
export class WelcomeNotification extends Notification {
    name;
    constructor(name) {
        super();
        this.name = name;
    }
    via() {
        return ['mail', 'database'];
    }
    toMail(notifiable) {
        return new WelcomeMail({
            fullname: this.name,
        });
    }
    toDatabase() {
        return { title: 'Welcome!', body: `Thanks for joining, ${this.name}.` };
    }
}
//# sourceMappingURL=WelcomeNotification.js.map