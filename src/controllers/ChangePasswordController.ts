import bcrypt from 'bcryptjs';
import Auth from '../lib/auth/index.js';
import { Controller } from '../lib/core/controller/index.js';
import { AccessToken } from '../models/AccessToken.js';
import { User } from '../models/User.js';
import type { ChangePasswordRequest } from '../requests/ChangePasswordRequest.js';

class ChangePasswordController extends Controller {
  async update(req: ChangePasswordRequest) {
    const data = req.validated<{ current_password: string; password: string }>();
    const authUser = this.user<{ email: string }>(req);

    const user = await User.findByEmailWithPassword(authUser.email);

    if (!user || !(await bcrypt.compare(data.current_password, String(user.getHidden('password'))))) {
      this.abort(422, 'Validation failed.', {
        current_password: ['Current password is incorrect.'],
      });
    }

    await AccessToken.destroyByUser(user.id);
    await user.update({ password: data.password });

    const signedIn = await Auth.login(user);
    if (!signedIn) {
      throw new Error('Password update succeeded, but the session could not be refreshed.');
    }

    const token = Auth.token();
    return this.ok({ token, user: signedIn }, 'Your password has been updated.');
  }
}

export const changePasswordController = new ChangePasswordController();
