import { DB } from '../lib/core/query/index.js';
const hydrate = (row) => ({
    id: Number(row.id),
    userId: Number(row.user_id),
    tokenHash: row.token_hash,
    expiresAt: row.expires_at ?? null,
    lastUsedAt: row.last_used_at ?? null,
});
export const AccessToken = {
    async create(input) {
        const now = new Date();
        await DB.table('access_tokens').insert({
            user_id: input.userId,
            token_hash: input.tokenHash,
            expires_at: input.expiresAt,
            created_at: now,
            updated_at: now,
        });
    },
    async findValid(tokenHash) {
        const row = await DB.table('access_tokens')
            .where('token_hash', tokenHash)
            .where((q) => q.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
            .first();
        return row ? hydrate(row) : null;
    },
    async touch(id) {
        await DB.table('access_tokens').where('id', id).update({ last_used_at: new Date() });
    },
    async destroyByHash(tokenHash) {
        await DB.table('access_tokens').where('token_hash', tokenHash).delete();
    },
    async destroyByUser(userId) {
        await DB.table('access_tokens').where('user_id', userId).delete();
    },
};
//# sourceMappingURL=AccessToken.js.map