import { Model, type Cast } from '../lib/core/model/index.js';
import { DB } from '../lib/core/query/index.js';

export interface DeviceInfo {
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

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

  static forUser(userId: number): Promise<AccessToken[]> {
    return AccessToken.query()
      .where('user_id', userId)
      .where((q) => q.whereNull('expires_at').orWhere('expires_at', '>', new Date()))
      .orderByDesc('last_used_at')
      .orderByDesc('id')
      .get();
  }

  static async touch(id: number): Promise<void> {
    const cutoff = new Date(Date.now() - 60_000);
    await AccessToken.rows()
      .where('id', id)
      .where((q) => q.whereNull('last_used_at').orWhere('last_used_at', '<', cutoff))
      .update({ last_used_at: new Date() });
  }

  static destroyForUser(id: number, userId: number): Promise<number> {
    return AccessToken.rows().where('id', id).where('user_id', userId).delete();
  }

  static destroyOthers(userId: number, keepId: number): Promise<number> {
    return AccessToken.rows().where('user_id', userId).where('id', '<>', keepId).delete();
  }

  static async destroyByHash(tokenHash: string): Promise<void> {
    await AccessToken.rows().where('token_hash', tokenHash).delete();
  }

  static async destroyByUser(userId: number): Promise<void> {
    await AccessToken.rows().where('user_id', userId).delete();
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
