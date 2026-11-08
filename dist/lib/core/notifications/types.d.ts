import type { Notification } from './Notification.js';
export type ChannelName = 'mail' | 'database' | 'sms' | (string & {});
/** Anything that can receive a notification (your User model/instance). */
export interface Notifiable {
    id: string | number;
    email?: string | null;
    phone?: string | null;
    /** Optional override, like Laravel's routeNotificationFor(). */
    routeNotificationFor?(channel: ChannelName): string | undefined;
}
export interface Channel {
    send(notifiable: Notifiable, notification: Notification): Promise<void>;
}
//# sourceMappingURL=types.d.ts.map