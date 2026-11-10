import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { getSettings, settingRules, updateSettings, type AccountSettings } from '../lib/admin/settings.js';

class AdminSettingController extends Controller {
  async index() {
    return this.ok(await getSettings());
  }

  async update(req: HttpRequest) {
    const changes = await this.validate<Partial<AccountSettings>>(req, settingRules());
    this.abortIf(Object.keys(changes).length === 0, 422, 'No valid settings were provided.');

    await updateSettings(changes);
    return this.ok(await getSettings(), 'Settings updated.');
  }
}

export const adminSettingController = new AdminSettingController();
