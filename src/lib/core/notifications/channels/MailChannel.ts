// notifications/channels/MailChannel.ts
// Forwards toMail() through admin-2.
import { mailPayload, sendNotification } from '../client.js';
import { routeFor } from '../Notifiable.js';
import type { Notification } from '../Notification.js';
import type { Channel, Notifiable } from '../types.js';

export class MailChannel implements Channel {
  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    const address = routeFor(notifiable, 'mail');
    if (!address) return; // nowhere to send, skip silently (same as Laravel)

    await sendNotification({
      id: notification.id,
      notifiableId: String(notifiable.id),
      type: notification.type,
      queue: false,
      delayMs: 0,
      channels: { mail: await mailPayload(notification, notifiable, address) },
    });
  }
}
