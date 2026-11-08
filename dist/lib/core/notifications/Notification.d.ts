import type { Mailable } from '../mail/index.js';
import type { ChannelName, Notifiable } from './types.js';
export declare abstract class Notification {
    /** Unique id, also used as the primary key in the database channel. */
    readonly id: string;
    /** Set to true to deliver in the background (with retries) instead of awaiting. */
    shouldQueue: boolean;
    /** Delay in ms before a queued notification is delivered. */
    delayMs: number;
    /** Notification type stored in the database channel. */
    get type(): string;
    /** Which channels this notification should go through. */
    abstract via(notifiable: Notifiable): ChannelName[];
    /** Implement the ones your via() uses. */
    toMail?(notifiable: Notifiable): Mailable;
    toDatabase?(notifiable: Notifiable): Record<string, unknown>;
    toSms?(notifiable: Notifiable): string;
}
//# sourceMappingURL=Notification.d.ts.map