import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { decryptBvn } from '../lib/kyc.js';
import { KycProfile } from '../models/KycProfile.js';
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

  async bvn(req: HttpRequest) {
    const id = Number(req.route('id'));
    if (!Number.isSafeInteger(id) || id < 1) this.abort(404, 'User not found.');

    const profile = await KycProfile.where('user_id', id).first();
    if (!profile || profile.status !== 'verified') {
      return this.ok({ bvn: null, fullName: null, phone: null });
    }

    return this.ok({
      bvn: decryptBvn(profile.bvnEncrypted),
      fullName: profile.fullName,
      phone: profile.phone,
    });
  }
}

export const internalUserController = new InternalUserController();
