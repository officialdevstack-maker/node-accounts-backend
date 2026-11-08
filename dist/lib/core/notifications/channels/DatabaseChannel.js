// notifications/channels/DatabaseChannel.ts
// Stores toDatabase() in the notifications table.
import { DatabaseNotification } from '../models/DatabaseNotification.js';
export class DatabaseChannel {
    async send(notifiable, notification) {
        if (!notification.toDatabase) {
            throw new Error(`${notification.type} uses the "database" channel but has no toDatabase() method.`);
        }
        if (notifiable.id === 'anonymous')
            return; // on-demand notifiables have no row to attach to
        await DatabaseNotification.create({
            id: notification.id,
            type: notification.type,
            notifiableId: String(notifiable.id),
            data: notification.toDatabase(notifiable),
        });
    }
}
//# sourceMappingURL=DatabaseChannel.js.map