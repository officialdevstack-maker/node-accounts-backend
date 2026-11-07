// notifications/Notify.ts
// The facade: Notify.send(user, new WelcomeNotification(user.name))
import { AnonymousNotifiable } from './Notifiable.js';
import { NotificationManager } from './NotificationManager.js';
import type { Notification } from './Notification.js';
import type { ChannelName, Notifiable } from './types.js';

export const Notify = {
  /** Send to one or many users (queued if notification.shouldQueue is true). */
  send: (notifiables: Notifiable | Notifiable[], notification: Notification) =>
    NotificationManager.send(notifiables, notification),

  /** Send immediately, ignoring shouldQueue. */
  sendNow: (notifiable: Notifiable, notification: Notification) =>
    NotificationManager.sendNow(notifiable, notification),

  /** On-demand: Notify.route('mail', 'a@b.com').route('sms', '+234...').notify(n) */
  route: (channel: ChannelName, address: string) => new AnonymousNotifiable().route(channel, address),
};
