import { config } from '../lib/core/config/index.js';
import { Controller } from '../lib/core/controller/index.js';
import { Mail, ResetPasswordMail } from '../lib/core/mail/index.js';
import { PasswordReset } from '../models/PasswordReset.js';
import { User } from '../models/User.js';
import type { ForgotPasswordRequest } from '../requests/ForgotPasswordRequest.js';

class ForgotPasswordController extends Controller {
  async create(req: ForgotPasswordRequest) {
    const { email } = req.validated<{ email: string }>();
    const user = await User.findByEmail(email);

    if (user) {
      const ttl = config('auth.passwordResetTtlMinutes');
      const token = await PasswordReset.issue(user.email, ttl);
      const query = new URLSearchParams({ token, email: user.email }).toString();
      const url = `${config('app.frontendUrl')}/reset-password?${query}`;

      Mail.to(user.email).queue(new ResetPasswordMail(user, url, ttl));
    }

    return this.ok(undefined, 'If an account exists for that email, a reset link has been sent.');
  }
}

export const forgotPasswordController = new ForgotPasswordController();
