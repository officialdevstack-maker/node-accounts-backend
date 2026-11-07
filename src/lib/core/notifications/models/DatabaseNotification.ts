import { DB, type Row } from '../../query/index.js';

const TABLE = 'notifications';

export interface DatabaseNotificationRecord {
  id: string;
  type: string;
  notifiableId: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const hydrate = (row: Row): DatabaseNotificationRecord => ({
  id: row.id,
  type: row.type,
  notifiableId: row.notifiable_id,
  data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
  readAt: row.read_at ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const DatabaseNotification = {
  async create(input: { id: string; type: string; notifiableId: string; data: Record<string, unknown> }): Promise<void> {
    const now = new Date();
    await DB.table(TABLE).insert({
      id: input.id,
      type: input.type,
      notifiable_id: input.notifiableId,
      data: input.data,
      read_at: null,
      created_at: now,
      updated_at: now,
    });
  },

  async forNotifiable(notifiableId: string | number, options: { unreadOnly?: boolean; limit?: number } = {}) {
    const rows = await DB.table(TABLE)
      .where('notifiable_id', String(notifiableId))
      .when(options.unreadOnly, (q) => q.whereNull('read_at'))
      .orderByDesc('created_at')
      .limit(options.limit ?? 50)
      .get();
    return rows.map(hydrate);
  },

  unreadCount(notifiableId: string | number): Promise<number> {
    return DB.table(TABLE).where('notifiable_id', String(notifiableId)).whereNull('read_at').count();
  },

  async markAsRead(id: string, notifiableId: string | number): Promise<void> {
    await DB.table(TABLE)
      .where('id', id)
      .where('notifiable_id', String(notifiableId))
      .whereNull('read_at')
      .update({ read_at: new Date(), updated_at: new Date() });
  },

  async markAllAsRead(notifiableId: string | number): Promise<void> {
    await DB.table(TABLE)
      .where('notifiable_id', String(notifiableId))
      .whereNull('read_at')
      .update({ read_at: new Date(), updated_at: new Date() });
  },
};
