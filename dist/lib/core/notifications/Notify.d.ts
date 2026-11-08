import { AnonymousNotifiable } from './Notifiable.js';
import type { Notification } from './Notification.js';
import type { ChannelName, Notifiable } from './types.js';
export declare const Notify: {
    /** Send to one or many users (queued if notification.shouldQueue is true). */
    send: (notifiables: Notifiable | Notifiable[], notification: Notification) => Promise<void>;
    /** Send immediately, ignoring shouldQueue. */
    sendNow: (notifiable: Notifiable, notification: Notification) => Promise<void>;
    /** On-demand: Notify.route('mail', 'a@b.com').route('sms', '+234...').notify(n) */
    route: (channel: ChannelName, address: string) => AnonymousNotifiable;
};
//# sourceMappingURL=Notify.d.ts.map