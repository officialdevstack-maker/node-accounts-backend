import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { Activity } from '../models/Activity.js';
import { OAuthGrant } from '../models/OAuthGrant.js';
import type { User } from '../models/User.js';

class ConnectedAppController extends Controller {
  async index(req: HttpRequest) {
    return this.ok(await OAuthGrant.forUserWithClients(this.user<User>(req).id));
  }

  async destroy(req: HttpRequest) {
    const user = this.user<User>(req);
    const id = Number(req.route('id'));

    const removed = await OAuthGrant.revoke(id, user.id);
    this.abortIf(removed === 0, 404, 'App not found.');

    await Activity.record(user.id, 'app_revoked', { ip: req.ip(), userAgent: req.userAgent() }, { grantId: id });
    return this.ok(undefined, 'App access removed.');
  }
}

export const connectedAppController = new ConnectedAppController();
