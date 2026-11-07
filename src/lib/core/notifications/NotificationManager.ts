// notifications/NotificationManager.ts
// Resolves channels and dispatches notifications (like Laravel's ChannelManager).
import { MailQueue } from '../mail/MailQueue.js';
import { DatabaseChannel } from './channels/DatabaseChannel.js';
import { MailChannel } from './channels/MailChannel.js';
import { SmsChannel } from './channels/SmsChannel.js';
import type { Notification } from './Notification.js';
import type { Channel, ChannelName, Notifiable } from './types.js';

export class NotificationManager {
  private static channels = new Map<ChannelName, Channel>([
    ['mail', new MailChannel()],
    ['database', new DatabaseChannel()],
    ['sms', new SmsChannel()],
  ]);

  /** Register a custom channel, e.g. NotificationManager.extend('push', new PushChannel()) */
  static extend(name: ChannelName, channel: Channel): void {
    this.channels.set(name, channel);
  }

  private static channel(name: ChannelName): Channel {
    const channel = this.channels.get(name);
    if (!channel) throw new Error(`Notification channel [${name}] is not registered.`);
    return channel;
  }

  /** Send respecting notification.shouldQueue. */
  static async send(notifiables: Notifiable | Notifiable[], notification: Notification): Promise<void> {
    const list = Array.isArray(notifiables) ? notifiables : [notifiables];

    for (const notifiable of list) {
      if (notification.shouldQueue) {
        this.queueFor(notifiable, notification);
      } else {
        await this.sendNow(notifiable, notification);
      }
    }
  }

  /** Send immediately, waits for every channel. */
  static async sendNow(notifiable: Notifiable, notification: Notification): Promise<void> {
    const results = await Promise.allSettled(
      notification.via(notifiable).map((name) => this.channel(name).send(notifiable, notification)),
    );

    const errors = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => r.reason);
    if (errors.length) {
      throw new AggregateError(errors, `${notification.type} failed on ${errors.length} channel(s).`);
    }
  }

  /** One job per channel, so a retry never re-sends a channel that already succeeded. */
  private static queueFor(notifiable: Notifiable, notification: Notification): void {
    for (const name of notification.via(notifiable)) {
      MailQueue.push(() => this.channel(name).send(notifiable, notification), notification.delayMs);
    }
  }
}
