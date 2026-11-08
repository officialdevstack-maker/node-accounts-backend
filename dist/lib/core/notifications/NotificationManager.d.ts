import type { Notification } from './Notification.js';
import type { Channel, ChannelName, Notifiable } from './types.js';
export declare class NotificationManager {
    private static channels;
    /** Register a custom channel, e.g. NotificationManager.extend('push', new PushChannel()) */
    static extend(name: ChannelName, channel: Channel): void;
    private static channel;
    /** Send respecting notification.shouldQueue. */
    static send(notifiables: Notifiable | Notifiable[], notification: Notification): Promise<void>;
    /** Send immediately, waits for every channel. */
    static sendNow(notifiable: Notifiable, notification: Notification): Promise<void>;
    /** One job per channel, so a retry never re-sends a channel that already succeeded. */
    private static queueFor;
}
//# sourceMappingURL=NotificationManager.d.ts.map