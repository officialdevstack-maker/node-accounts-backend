// notifications/channels/DatabaseChannel.ts
// Stores toDatabase() in the notifications table.
import { DatabaseNotification } from '../models/DatabaseNotification.js';
import type { Notification } from '../Notification.js';
import type { Channel, Notifiable } from '../types.js';

export class DatabaseChannel implements Channel {
  async send(notifiable: Notifiable, notification: Notification): Promise<void> {
    if (!notification.toDatabase) {
      throw new Error(`${notification.type} uses the "database" channel but has no toDatabase() method.`);
    }

    if (notifiable.id === 'anonymous') return; // on-demand notifiables have no row to attach to

    if (!DatabaseNotification.sequelize) {
      throw new Error('DatabaseNotification is not initialised. Call initDatabaseNotification(sequelize) at boot.');
    }

    await DatabaseNotification.create({
      id: notification.id,
      type: notification.type,
      notifiableId: String(notifiable.id),
      data: notification.toDatabase(notifiable),
    });
  }
}
