import { Model, type Cast } from '../lib/core/model/index.js';

export interface Preferences {
  newDeviceAlerts: boolean;
  loginAlerts: boolean;
}

const DEFAULTS: Preferences = { newDeviceAlerts: true, loginAlerts: false };

export class UserPreference extends Model {
  static table = 'user_preferences';
  static fillable = ['userId', 'newDeviceAlerts', 'loginAlerts'];
  static casts: Record<string, Cast> = {
    id: 'int',
    userId: 'int',
    newDeviceAlerts: 'boolean',
    loginAlerts: 'boolean',
  };

  declare id: number;
  declare userId: number;
  declare newDeviceAlerts: boolean;
  declare loginAlerts: boolean;

  static async for(userId: number): Promise<Preferences> {
    const preference = await UserPreference.where('user_id', userId).first();
    return preference
      ? {
          newDeviceAlerts: preference.newDeviceAlerts,
          loginAlerts: preference.loginAlerts,
        }
      : { ...DEFAULTS };
  }

  static async update(userId: number, changes: Partial<Preferences>): Promise<Preferences> {
    const next = { ...(await UserPreference.for(userId)), ...changes };
    await UserPreference.updateOrCreate({ userId }, next);
    return next;
  }
}
