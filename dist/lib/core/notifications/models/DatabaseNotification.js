import { DB } from '../../query/index.js';
const TABLE = 'notifications';
const hydrate = (row) => ({
    id: row.id,
    type: row.type,
    notifiableId: row.notifiable_id,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    readAt: row.read_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const DatabaseNotification = {
    async create(input) {
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
    async forNotifiable(notifiableId, options = {}) {
        const rows = await DB.table(TABLE)
            .where('notifiable_id', String(notifiableId))
            .when(options.unreadOnly, (q) => q.whereNull('read_at'))
            .orderByDesc('created_at')
            .limit(options.limit ?? 50)
            .get();
        return rows.map(hydrate);
    },
    unreadCount(notifiableId) {
        return DB.table(TABLE).where('notifiable_id', String(notifiableId)).whereNull('read_at').count();
    },
    async markAsRead(id, notifiableId) {
        await DB.table(TABLE)
            .where('id', id)
            .where('notifiable_id', String(notifiableId))
            .whereNull('read_at')
            .update({ read_at: new Date(), updated_at: new Date() });
    },
    async markAllAsRead(notifiableId) {
        await DB.table(TABLE)
            .where('notifiable_id', String(notifiableId))
            .whereNull('read_at')
            .update({ read_at: new Date(), updated_at: new Date() });
    },
};
//# sourceMappingURL=DatabaseNotification.js.map