import type { Notification } from '../Notification.js';
import type { Channel, Notifiable } from '../types.js';
export declare class DatabaseChannel implements Channel {
    send(notifiable: Notifiable, notification: Notification): Promise<void>;
}
//# sourceMappingURL=DatabaseChannel.d.ts.map