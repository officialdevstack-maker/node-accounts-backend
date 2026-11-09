import { Controller } from '../lib/core/controller/index.js';
import { AccessToken } from '../models/AccessToken.js';
import { Activity } from '../models/Activity.js';
import { OAuthCode } from '../models/OAuthCode.js';
import { OAuthRefreshToken } from '../models/OAuthRefreshToken.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { User } from '../models/User.js';
import type { ResetPasswordRequest } from '../requests/ResetPasswordRequest.js';

class ResetPasswordController extends Controller {
  async create(req: ResetPasswordRequest) {
    const data = req.validated<{ token: string; email: string; password: string }>();

    const valid = await PasswordReset.isValid(data.email, data.token);
    const user = valid ? await User.findByEmail(data.email) : null;

    if (!user) {
      this.abort(422, 'Validation failed.', {
        token: ['This password reset link is invalid or has expired.'],
      });
    }

    await user.update({ password: data.password });
    await PasswordReset.destroyByEmail(user.email);
    await AccessToken.destroyByUser(user.id);
    await Promise.all([
      OAuthRefreshToken.destroyForUser(user.id),
      OAuthCode.destroyForUser(user.id),
    ]);
    await Activity.record(user.id, 'password_reset');

    return this.ok(undefined, 'Your password has been reset. You can now sign in.');
  }
}

export const resetPasswordController = new ResetPasswordController();
