import { DB, type Row } from '../lib/core/query/index.js';

export interface AccessTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

const hydrate = (row: Row): AccessTokenRecord => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  tokenHash: row.token_hash,
  expiresAt: row.expires_at ?? null,
  lastUsedAt: row.last_used_at ?? null,
});

export const AccessToken = {
  async create(input: { userId: number; tokenHash: string; expiresAt: Date | null }): Promise<void> {
    const now = new Date();
    await DB.table('access_tokens').insert({
      user_id: input.userId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
      created_at: now,
      updated_at: now,
    });
  },

  async findValid(tokenHash: string): Promise<AccessTokenRecord | null> {
    const row = await DB.table('access_tokens')
      .where('token_hash', tokenHash)
      .where((q) => q.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
      .first();
    return row ? hydrate(row) : null;
  },

  async touch(id: number): Promise<void> {
    await DB.table('access_tokens').where('id', id).update({ last_used_at: new Date() });
  },

  async destroyByHash(tokenHash: string): Promise<void> {
    await DB.table('access_tokens').where('token_hash', tokenHash).delete();
  },

  async destroyByUser(userId: number): Promise<void> {
    await DB.table('access_tokens').where('user_id', userId).delete();
  },
};
