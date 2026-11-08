// notifications/NotificationManager.ts
// Resolves channels and dispatches notifications (like Laravel's ChannelManager).
import { MailQueue } from '../mail/MailQueue.js';
import { DatabaseChannel } from './channels/DatabaseChannel.js';
import { MailChannel } from './channels/MailChannel.js';
import { SmsChannel } from './channels/SmsChannel.js';
export class NotificationManager {
    static channels = new Map([
        ['mail', new MailChannel()],
        ['database', new DatabaseChannel()],
        ['sms', new SmsChannel()],
    ]);
    /** Register a custom channel, e.g. NotificationManager.extend('push', new PushChannel()) */
    static extend(name, channel) {
        this.channels.set(name, channel);
    }
    static channel(name) {
        const channel = this.channels.get(name);
        if (!channel)
            throw new Error(`Notification channel [${name}] is not registered.`);
        return channel;
    }
    /** Send respecting notification.shouldQueue. */
    static async send(notifiables, notification) {
        const list = Array.isArray(notifiables) ? notifiables : [notifiables];
        for (const notifiable of list) {
            if (notification.shouldQueue) {
                this.queueFor(notifiable, notification);
            }
            else {
                await this.sendNow(notifiable, notification);
            }
        }
    }
    /** Send immediately, waits for every channel. */
    static async sendNow(notifiable, notification) {
        const results = await Promise.allSettled(notification.via(notifiable).map((name) => this.channel(name).send(notifiable, notification)));
        const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason);
        if (errors.length) {
            throw new AggregateError(errors, `${notification.type} failed on ${errors.length} channel(s).`);
        }
    }
    /** One job per channel, so a retry never re-sends a channel that already succeeded. */
    static queueFor(notifiable, notification) {
        for (const name of notification.via(notifiable)) {
            MailQueue.push(() => this.channel(name).send(notifiable, notification), notification.delayMs);
        }
    }
}
//# sourceMappingURL=NotificationManager.js.map