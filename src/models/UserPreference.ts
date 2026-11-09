import { DB } from '../lib/core/query/index.js';

const TABLE = 'user_preferences';

export interface Preferences {
  newDeviceAlerts: boolean;
}

const DEFAULTS: Preferences = { newDeviceAlerts: true };

export const UserPreference = {
  /** No row yet means the defaults apply. */
  async for(userId: number): Promise<Preferences> {
    const row = await DB.table(TABLE).where('user_id', userId).first();
    return row ? { newDeviceAlerts: Boolean(row.new_device_alerts) } : { ...DEFAULTS };
  },

  async update(userId: number, changes: Partial<Preferences>): Promise<Preferences> {
    const next = { ...(await UserPreference.for(userId)), ...changes };
    const now = new Date();

    await DB.table(TABLE).upsert(
      [{ user_id: userId, new_device_alerts: next.newDeviceAlerts ? 1 : 0, created_at: now, updated_at: now }],
      ['user_id'],
      ['new_device_alerts', 'updated_at'],
    );
    return next;
  },
};
