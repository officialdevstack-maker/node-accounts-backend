import { LoginAlertMail, Mail, NewDeviceLoginMail } from '../core/mail/index.js';
import { Activity, type ActivityContext } from '../../models/Activity.js';
import { UserPreference } from '../../models/UserPreference.js';
import type { User } from '../../models/User.js';
import { describeDevice } from './device.js';

/**
 * Call before recording the current login so new-device checks only use prior logins.
 * Sends at most one alert email and does not interrupt sign-in if notification fails.
 */
export async function notifyOnLogin(
  user: Pick<User, 'id' | 'email' | 'fullname'>,
  ctx: ActivityContext,
): Promise<void> {
  try {
    const prefs = await UserPreference.for(user.id);
    if (!prefs.loginAlerts && !prefs.newDeviceAlerts) return;

    const device = describeDevice(ctx.userAgent);
    const history = await Activity.loginHistory(user.id, device);
    const newDevice = history.any && !history.sameDevice;
    const ip = ctx.ip ?? null;
    const at = new Date();

    if (prefs.loginAlerts) {
      Mail.to(user.email).queue(new LoginAlertMail(user, device, ip, at, newDevice));
    } else if (newDevice) {
      Mail.to(user.email).queue(new NewDeviceLoginMail(user, device, ip, at));
    }
  } catch (error) {
    console.error('[alerts] login alert failed', error);
  }
}
