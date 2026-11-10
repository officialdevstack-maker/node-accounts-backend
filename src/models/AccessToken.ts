import { Cache } from '../lib/core/cache/index.js';
import { config } from '../lib/core/config/index.js';
import { Model, type Cast } from '../lib/core/model/index.js';
import { DB } from '../lib/core/query/index.js';

export interface DeviceInfo {
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

type CachedToken = { id: number; userId: number; expiresAt: string | null };

const TOUCH_EVERY_MS = 60_000;
const TOUCH_SWEEP_AT = 5000;
const lastTouched = new Map<number, number>();

export class AccessToken extends Model {
  static table = 'access_tokens';
  static fillable = ['userId', 'tokenHash', 'expiresAt', 'deviceName', 'ipAddress', 'userAgent'];
  static hidden = ['tokenHash'];

  static createdAt = 'createdAt';
  static updatedAt = 'updatedAt';
  static columns: Record<string, string> = { createdAt: 'createdAt', updatedAt: 'updatedAt' };

  static casts: Record<string, Cast> = {
    id: 'int',
    userId: 'int',
    expiresAt: 'date',
    lastUsedAt: 'date',
    createdAt: 'date',
    updatedAt: 'date',
  };

  declare id: number;
  declare userId: number;
  declare tokenHash: string;
  declare expiresAt: Date | null;
  declare lastUsedAt: Date | null;
  declare deviceName: string | null;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  private static rows() {
    return DB.table(AccessToken.tableName());
  }

  private static cacheKey(tokenHash: string): string {
    return `auth:token:${tokenHash}`;
  }

  private static async forgetHashes(rows: Array<Record<string, unknown>>): Promise<void> {
    const keys = rows.map((row) => AccessToken.cacheKey(String(row['token_hash'])));
    if (keys.length) await Cache.forget(...keys);
  }

  static issue(
    input: { userId: number; tokenHash: string; expiresAt: Date | null } & Partial<DeviceInfo>,
  ): Promise<AccessToken> {
    return AccessToken.create({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      deviceName: input.deviceName ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  }

  static findValid(tokenHash: string): Promise<AccessToken | null> {
    return AccessToken.query()
      .where('token_hash', tokenHash)
      .where((q) => q.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
      .first();
  }

  static async resolve(tokenHash: string): Promise<{ id: number; userId: number } | null> {
    const key = AccessToken.cacheKey(tokenHash);

    const cached = await Cache.get<CachedToken>(key);
    if (cached) {
      const alive = cached.expiresAt === null || new Date(cached.expiresAt).getTime() > Date.now();
      if (alive) return { id: cached.id, userId: cached.userId };
      await Cache.forget(key);
      return null;
    }

    const record = await AccessToken.findValid(tokenHash);
    if (!record) return null;

    const maxTtl = config('cache.authTokenTtl');
    const ttl = record.expiresAt
      ? Math.min(maxTtl, Math.max(1, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000)))
      : maxTtl;

    if (ttl >= 1) {
      await Cache.put(
        key,
        { id: record.id, userId: record.userId, expiresAt: record.expiresAt?.toISOString() ?? null } satisfies CachedToken,
        ttl,
      );
    }

    return { id: record.id, userId: record.userId };
  }

  static forUser(userId: number): Promise<AccessToken[]> {
    return AccessToken.query()
      .where('user_id', userId)
      .where((q) => q.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
      .orderByRaw('(last_used_at IS NULL) asc')
      .orderByDesc('last_used_at')
      .orderByDesc('id')
      .get();
  }

  static async touch(id: number): Promise<void> {
    const now = Date.now();
    const last = lastTouched.get(id);
    if (last !== undefined && now - last < TOUCH_EVERY_MS) return;

    lastTouched.set(id, now);
    if (lastTouched.size > TOUCH_SWEEP_AT) {
      for (const [key, at] of lastTouched) if (now - at >= TOUCH_EVERY_MS) lastTouched.delete(key);
    }

    const cutoff = new Date(now - TOUCH_EVERY_MS);
    await AccessToken.rows()
      .where('id', id)
      .where((q) => q.whereNull('last_used_at').orWhere('last_used_at', '<', cutoff))
      .update({ last_used_at: new Date() });
  }

  static async destroyForUser(id: number, userId: number): Promise<number> {
    const doomed = await AccessToken.rows().where('id', id).where('user_id', userId).select('token_hash').get();
    const removed = await AccessToken.rows().where('id', id).where('user_id', userId).delete();
    await AccessToken.forgetHashes(doomed);
    return removed;
  }

  static async destroyOthers(userId: number, keepId: number): Promise<number> {
    const doomed = await AccessToken.rows().where('user_id', userId).where('id', '<>', keepId).select('token_hash').get();
    const removed = await AccessToken.rows().where('user_id', userId).where('id', '<>', keepId).delete();
    await AccessToken.forgetHashes(doomed);
    return removed;
  }

  static async destroyByHash(tokenHash: string): Promise<void> {
    await AccessToken.rows().where('token_hash', tokenHash).delete();
    await Cache.forget(AccessToken.cacheKey(tokenHash));
  }

  static async destroyByUser(userId: number): Promise<void> {
    const doomed = await AccessToken.rows().where('user_id', userId).select('token_hash').get();
    await AccessToken.rows().where('user_id', userId).delete();
    await AccessToken.forgetHashes(doomed);
  }

  isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt.getTime() <= Date.now();
  }

  toDevice(currentId: number | null) {
    return {
      id: this.id,
      deviceName: this.deviceName ?? 'Unknown device',
      ipAddress: this.ipAddress ?? null,
      lastUsedAt: this.lastUsedAt ?? null,
      signedInAt: this.createdAt,
      expiresAt: this.expiresAt ?? null,
      current: this.id === currentId,
    };
  }
}
