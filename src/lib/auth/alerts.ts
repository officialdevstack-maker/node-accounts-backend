import { Mail, NewDeviceLoginMail } from '../core/mail/index.js';
import { Activity, type ActivityContext } from '../../models/Activity.js';
import { UserPreference } from '../../models/UserPreference.js';
import type { User } from '../../models/User.js';
import { describeDevice } from './device.js';

/** Call before recording the current login. Never throws. */
export async function notifyIfNewDevice(
  user: Pick<User, 'id' | 'email' | 'fullname'>,
  ctx: ActivityContext,
): Promise<void> {
  try {
    const device = describeDevice(ctx.userAgent);
    const prefs = await UserPreference.for(user.id);
    if (!prefs.newDeviceAlerts) return;

    const history = await Activity.loginHistory(user.id, device);
    if (!history.any || history.sameDevice) return;

    Mail.to(user.email).queue(new NewDeviceLoginMail(user, device, ctx.ip ?? null, new Date()));
  } catch (error) {
    console.error('[alerts] new-device check failed', error);
  }
}
