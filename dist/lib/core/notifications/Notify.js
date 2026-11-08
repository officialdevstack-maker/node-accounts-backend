// notifications/Notify.ts
// The facade: Notify.send(user, new WelcomeNotification(user.fullname))
import { AnonymousNotifiable } from './Notifiable.js';
import { NotificationManager } from './NotificationManager.js';
export const Notify = {
    /** Send to one or many users (queued if notification.shouldQueue is true). */
    send: (notifiables, notification) => NotificationManager.send(notifiables, notification),
    /** Send immediately, ignoring shouldQueue. */
    sendNow: (notifiable, notification) => NotificationManager.sendNow(notifiable, notification),
    /** On-demand: Notify.route('mail', 'a@b.com').route('sms', '+234...').notify(n) */
    route: (channel, address) => new AnonymousNotifiable().route(channel, address),
};
//# sourceMappingURL=Notify.js.map