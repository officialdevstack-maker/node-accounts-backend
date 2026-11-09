import { DB, type Row } from '../lib/core/query/index.js';

export interface AccessTokenRecord {
  id: number;
  userId: number;
  tokenHash: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

export interface DeviceInfo {
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const hydrate = (row: Row): AccessTokenRecord => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  tokenHash: row.token_hash,
  expiresAt: row.expires_at ?? null,
  lastUsedAt: row.last_used_at ?? null,
});

export const AccessToken = {
  async create(
    input: { userId: number; tokenHash: string; expiresAt: Date | null } & Partial<DeviceInfo>,
  ): Promise<number> {
    const now = new Date();
    const id = await DB.table('access_tokens').insertGetId({
      user_id: input.userId,
      token_hash: input.tokenHash,
      expires_at: input.expiresAt,
      device_name: input.deviceName ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
      createdAt: now,
      updatedAt: now,
    });
    return Number(id);
  },

  async forUser(userId: number) {
    const rows = await DB.table('access_tokens')
      .where('user_id', userId)
      .where((query) => query.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
      .orderByDesc('last_used_at')
      .orderByDesc('id')
      .get();

    return rows.map((row) => ({
      id: Number(row.id),
      deviceName: row.device_name ?? 'Unknown device',
      ipAddress: row.ip_address ?? null,
      lastUsedAt: row.last_used_at ?? null,
      signedInAt: row.createdAt,
      expiresAt: row.expires_at ?? null,
    }));
  },

  destroyForUser(id: number, userId: number): Promise<number> {
    return DB.table('access_tokens').where('id', id).where('user_id', userId).delete();
  },

  destroyOthers(userId: number, keepId: number): Promise<number> {
    return DB.table('access_tokens').where('user_id', userId).where('id', '<>', keepId).delete();
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
