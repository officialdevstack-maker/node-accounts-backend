import type { Notification } from '../Notification.js';
import type { Channel, Notifiable } from '../types.js';
export declare class MailChannel implements Channel {
    send(notifiable: Notifiable, notification: Notification): Promise<void>;
}
//# sourceMappingURL=MailChannel.d.ts.map