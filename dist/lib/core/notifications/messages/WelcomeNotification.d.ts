import { WelcomeMail } from '../../mail/index.js';
import { Notification } from '../Notification.js';
import type { ChannelName, Notifiable } from '../types.js';
export declare class WelcomeNotification extends Notification {
    private name;
    constructor(name: string);
    via(): ChannelName[];
    toMail(notifiable: Notifiable): WelcomeMail;
    toDatabase(): {
        title: string;
        body: string;
    };
}
//# sourceMappingURL=WelcomeNotification.d.ts.map