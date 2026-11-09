import bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { Controller, Reply, type HttpRequest } from '../lib/core/controller/index.js';
import { DB } from '../lib/core/query/index.js';
import { AccessToken } from '../models/AccessToken.js';
import { Activity } from '../models/Activity.js';
import { User } from '../models/User.js';
import { UserPreference } from '../models/UserPreference.js';
import type { DeleteAccountRequest } from '../requests/DeleteAccountRequest.js';
import { removeFile } from './AvatarController.js';

const COOKIE_NAME = 'auth_token';

class PrivacyController extends Controller {
  async export(req: HttpRequest) {
    const user = this.user<User>(req);
    const currentId = req.auth.currentTokenId();

    const [preferences, tokens, activity] = await Promise.all([
      UserPreference.for(user.id),
      AccessToken.forUser(user.id),
      Activity.exportFor(user.id),
    ]);

    await Activity.record(user.id, 'data_exported', { ip: req.ip(), userAgent: req.userAgent() });

    return Reply.json({
      exportedAt: new Date().toISOString(),
      profile: user.toObject(),
      preferences,
      devices: tokens.map((token) => token.toDevice(currentId)),
      activity,
    }).header('Content-Disposition', 'attachment; filename="spurs-account-data.json"');
  }

  async destroy(req: DeleteAccountRequest, res: Response) {
    const { password } = req.validated<{ password: string }>();
    const authUser = this.user<{ email: string }>(req);

    const user = await User.findByEmailWithPassword(authUser.email);
    if (!user || !(await bcrypt.compare(password, String(user.getHidden('password'))))) {
      this.abort(422, 'Validation failed.', { password: ['Password is incorrect.'] });
    }

    const avatar = user.avatar;

    await DB.transaction(async () => {
      await DB.table('password_resets').where('email', user.email).delete();
      await DB.table('notifications').where('notifiable_id', String(user.id)).delete();
      await user.delete();
    });

    await removeFile(avatar);
    res.clearCookie(COOKIE_NAME);

    return this.ok(undefined, 'Your account has been deleted.');
  }
}

export const privacyController = new PrivacyController();
