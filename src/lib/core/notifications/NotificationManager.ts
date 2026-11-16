// notifications/NotificationManager.ts
// Forwards notifications to the shared admin-2 notification service.
import { MailQueue } from '../mail/MailQueue.js';
import { routeFor } from './Notifiable.js';
import type { Notification } from './Notification.js';
import { mailPayload, sendNotification } from './client.js';
import type { Channel, ChannelName, Notifiable } from './types.js';

export class NotificationManager {
  private static extensions = new Map<ChannelName, Channel>();

  static extend(name: ChannelName, channel: Channel): void {
    this.extensions.set(name, channel);
  }

  /** Send respecting notification.shouldQueue. */
  static async send(notifiables: Notifiable | Notifiable[], notification: Notification): Promise<void> {
    const list = Array.isArray(notifiables) ? notifiables : [notifiables];

    for (const notifiable of list) {
      await this.dispatch(notifiable, notification, notification.shouldQueue);
    }
  }

  /** Send immediately, waits for every channel. */
  static async sendNow(notifiable: Notifiable, notification: Notification): Promise<void> {
    await this.dispatch(notifiable, notification, false);
  }

  private static async dispatch(
    notifiable: Notifiable,
    notification: Notification,
    queue: boolean,
  ): Promise<void> {
    const channels = new Set(notification.via(notifiable));
    const payload: {
      database?: { data: Record<string, unknown> };
      mail?: { to: string; subject: string; text?: string; html?: string };
      sms?: { to: string; message: string };
    } = {};
    const localDeliveries: Promise<void>[] = [];

    if (channels.has('database') && notifiable.id !== 'anonymous') {
      if (!notification.toDatabase) {
        throw new Error(`${notification.type} uses the "database" channel but has no toDatabase() method.`);
      }
      payload.database = { data: notification.toDatabase(notifiable) };
    }

    if (channels.has('mail')) {
      const address = routeFor(notifiable, 'mail');
      if (address) {
        payload.mail = await mailPayload(notification, notifiable, address);
      }
    }

    if (channels.has('sms')) {
      if (!notification.toSms) {
        throw new Error(`${notification.type} uses the "sms" channel but has no toSms() method.`);
      }
      const phone = routeFor(notifiable, 'sms');
      if (phone) payload.sms = { to: phone, message: notification.toSms(notifiable) };
    }

    for (const channel of channels) {
      if (!['database', 'mail', 'sms'].includes(channel)) {
        const extension = this.extensions.get(channel);
        if (!extension) throw new Error(`Notification channel [${channel}] is not registered.`);
        if (queue) {
          MailQueue.push(() => extension.send(notifiable, notification), notification.delayMs);
        } else {
          localDeliveries.push(extension.send(notifiable, notification));
        }
      }
    }

    const deliveries = [...localDeliveries];
    if (payload.database || payload.mail || payload.sms) {
      deliveries.push(
        sendNotification({
          id: notification.id,
          notifiableId: String(notifiable.id),
          type: notification.type,
          queue,
          delayMs: queue ? notification.delayMs : 0,
          channels: payload,
        }),
      );
    }

    const results = await Promise.allSettled(deliveries);
    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) => result.reason);
    if (errors.length) {
      throw new AggregateError(errors, `${notification.type} failed on ${errors.length} channel(s).`);
    }
  }
}
