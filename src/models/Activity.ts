import { DB, type Row } from '../lib/core/query/index.js';
import { describeDevice } from '../lib/auth/device.js';

const TABLE = 'account_activities';

export type ActivityEvent =
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'logout_all'
  | 'password_changed'
  | 'password_reset'
  | 'email_verified'
  | 'device_revoked'
  | 'profile_updated'
  | 'avatar_updated'
  | 'avatar_removed'
  | 'data_exported';

export interface ActivityContext {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

const hydrate = (row: Row) => ({
  id: Number(row.id),
  event: String(row.event),
  ipAddress: row.ip_address ?? null,
  deviceName: row.device_name ?? null,
  meta: typeof row.meta === 'string' ? JSON.parse(row.meta) : (row.meta ?? null),
  createdAt: row.created_at,
});

export const Activity = {
  /** Has this user logged in before, and did any of those logins use this device label? */
  async loginHistory(userId: number, deviceName: string): Promise<{ any: boolean; sameDevice: boolean }> {
    const base = () => DB.table(TABLE).where('user_id', userId).where('event', 'login');
    const any = await base().exists();
    return { any, sameDevice: any ? await base().where('device_name', deviceName).exists() : false };
  },

  async record(
    userId: number,
    event: ActivityEvent,
    context: ActivityContext = {},
    meta?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const userAgent = context.userAgent?.slice(0, 255);
      await DB.table(TABLE).insert({
        user_id: userId,
        event,
        ip_address: context.ip ?? null,
        user_agent: userAgent ?? null,
        device_name: describeDevice(userAgent),
        meta: meta ?? null,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('[activity] could not record', event, error);
    }
  },

  hasSeenDevice(userId: number, userAgent: string): Promise<boolean> {
    return DB.table(TABLE)
      .where('user_id', userId)
      .where('event', 'login')
      .where('user_agent', userAgent.slice(0, 255))
      .exists();
  },

  async forUser(userId: number, page: number, perPage: number) {
    const result = await DB.table(TABLE)
      .where('user_id', userId)
      .orderByDesc('id')
      .paginate(perPage, page);
    return { ...result, data: result.data.map(hydrate) };
  },

  async exportFor(userId: number, limit = 1000) {
    const rows = await DB.table(TABLE)
      .where('user_id', userId)
      .orderByDesc('id')
      .limit(limit)
      .get();
    return rows.map(hydrate);
  },
};
