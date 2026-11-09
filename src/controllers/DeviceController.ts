import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { Activity } from '../models/Activity.js';
import { AccessToken } from '../models/AccessToken.js';
import type { User } from '../models/User.js';

class DeviceController extends Controller {
  async index(req: HttpRequest) {
    const user = this.user<User>(req);
    const currentId = req.auth.currentTokenId();
    const devices = await AccessToken.forUser(user.id);

    return this.ok(devices.map((device) => device.toDevice(currentId)));
  }

  async destroy(req: HttpRequest) {
    const user = this.user<User>(req);
    const id = Number(req.route('id'));

    this.abortIf(id === req.auth.currentTokenId(), 422, 'This is your current device. Use logout instead.');

    const removed = await AccessToken.destroyForUser(id, user.id);
    this.abortIf(removed === 0, 404, 'Device not found.');

    await Activity.record(
      user.id,
      'device_revoked',
      { ip: req.ip(), userAgent: req.userAgent() },
      { tokenId: id },
    );
    return this.ok(undefined, 'Device signed out.');
  }

  async destroyOthers(req: HttpRequest) {
    const user = this.user<User>(req);
    const currentId = req.auth.currentTokenId();
    if (currentId === null) this.abort(401, 'Invalid or expired token.');

    const removed = await AccessToken.destroyOthers(user.id, currentId);
    await Activity.record(
      user.id,
      'device_revoked',
      { ip: req.ip(), userAgent: req.userAgent() },
      { count: removed, scope: 'others' },
    );
    return this.ok({ removed }, 'Signed out of all other devices.');
  }
}

export const deviceController = new DeviceController();
