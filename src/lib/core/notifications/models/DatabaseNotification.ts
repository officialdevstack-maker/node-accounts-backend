import {
  deleteNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsFor,
  sendNotification,
  unreadNotificationCount,
} from '../client.js';
import { config } from '../../config/index.js';

export interface DatabaseNotificationRecord {
  id: string;
  type: string;
  notifiableId: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const hydrate = (record: Awaited<ReturnType<typeof notificationsFor>>[number]): DatabaseNotificationRecord => ({
  ...record,
  readAt: record.readAt ? new Date(record.readAt) : null,
  createdAt: new Date(record.createdAt),
  updatedAt: new Date(record.updatedAt),
});

export const DatabaseNotification = {
  async create(input: { id: string; type: string; notifiableId: string; data: Record<string, unknown> }): Promise<void> {
    await sendNotification({
      ...input,
      queue: false,
      delayMs: 0,
      channels: { database: { data: input.data } },
    });
  },

  async forNotifiable(notifiableId: string | number, options: { unreadOnly?: boolean; limit?: number } = {}) {
    const records = await notificationsFor(notifiableId, {
      ...(options.unreadOnly === undefined ? {} : { unreadOnly: options.unreadOnly }),
      limit: options.limit ?? config('notifications.inboxLimit'),
    });
    return records.map(hydrate);
  },

  unreadCount: unreadNotificationCount,

  markAsRead: markNotificationRead,

  markAllAsRead: markAllNotificationsRead,
  deleteForNotifiable: deleteNotifications,
};
