import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { User } from '../models/User.js';

class InternalUserController extends Controller {
  async show(req: HttpRequest) {
    const id = Number(req.route('id'));
    if (!Number.isSafeInteger(id) || id < 1) this.abort(404, 'User not found.');

    const user = await User.find(id);
    if (!user) this.abort(404, 'User not found.');

    return this.ok({
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      isVerified: user.isVerified,
      accountType: user.accountType,
      suspendedAt: user.suspendedAt,
      isAdmin: user.isAdmin,
    });
  }
}

export const internalUserController = new InternalUserController();
