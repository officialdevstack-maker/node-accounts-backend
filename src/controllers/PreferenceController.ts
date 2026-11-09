import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { UserPreference, type Preferences } from '../models/UserPreference.js';
import type { User } from '../models/User.js';

class PreferenceController extends Controller {
  async show(req: HttpRequest) {
    return this.ok(await UserPreference.for(this.user<User>(req).id));
  }

  async update(req: HttpRequest) {
    const user = this.user<User>(req);
    const data = await this.validate<{ new_device_alerts?: unknown; login_alerts?: unknown }>(req, {
      new_device_alerts: 'sometimes|boolean',
      login_alerts: 'sometimes|boolean',
    });

    const changes: Partial<Preferences> = {};
    if (data.new_device_alerts !== undefined) changes.newDeviceAlerts = req.boolean('new_device_alerts');
    if (data.login_alerts !== undefined) changes.loginAlerts = req.boolean('login_alerts');

    return this.ok(await UserPreference.update(user.id, changes), 'Preferences updated.');
  }
}

export const preferenceController = new PreferenceController();
