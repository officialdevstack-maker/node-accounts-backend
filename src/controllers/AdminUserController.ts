import type { Response } from 'express';
import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { notifyBackchannelLogoutAfterResponse } from '../lib/oidc/response-logout.js';
import { AccessToken } from '../models/AccessToken.js';
import { Activity, type ActivityEvent } from '../models/Activity.js';
import { OAuthCode } from '../models/OAuthCode.js';
import { OAuthRefreshToken } from '../models/OAuthRefreshToken.js';
import { User } from '../models/User.js';

class AdminUserController extends Controller {
  async index(req: HttpRequest) {
    const { page, perPage } = this.pageParams(req);
    const search = String(req.query('search') ?? '').trim();
    const query = User.query().orderByDesc('id');

    if (search) {
      query.where((g) =>
        g.where('email', 'like', `%${search}%`).orWhere('fullname', 'like', `%${search}%`),
      );
    }
    if (req.query('status') === 'suspended') query.whereNotNull('suspended_at');

    return this.paginated(await query.paginate(perPage, page));
  }

  async show(req: HttpRequest) {
    const user = await this.target(req);
    const [devices, activity] = await Promise.all([
      AccessToken.forUser(user.id),
      Activity.forUser(user.id, 1, 20),
    ]);
    return this.ok({ user, devices: devices.map((d) => d.toDevice(null)), activity: activity.data });
  }

  async suspend(req: HttpRequest, res: Response) {
    const admin = this.user<User>(req);
    const user = await this.target(req);
    this.abortIf(user.id === admin.id, 422, 'You cannot suspend yourself.');
    this.abortIf(user.isAdmin, 422, 'Admins cannot be suspended.');

    if (!user.suspendedAt) {
      user.forceFill({ suspendedAt: new Date() });
      await user.save();
      await this.revokeAccess(user.id);
      notifyBackchannelLogoutAfterResponse(res, user.id);
      await this.audit(req, admin, user, 'user_suspended');
    }
    return this.ok(user, 'User suspended.');
  }

  async unsuspend(req: HttpRequest) {
    const admin = this.user<User>(req);
    const user = await this.target(req);

    if (user.suspendedAt) {
      user.forceFill({ suspendedAt: null });
      await user.save();
      await this.audit(req, admin, user, 'user_unsuspended');
    }
    return this.ok(user, 'User reinstated.');
  }

  async revokeSessions(req: HttpRequest, res: Response) {
    const admin = this.user<User>(req);
    const user = await this.target(req);

    await this.revokeAccess(user.id);
    notifyBackchannelLogoutAfterResponse(res, user.id);
    await this.audit(req, admin, user, 'sessions_revoked_by_admin');
    return this.ok(undefined, 'All sessions and app tokens revoked.');
  }

  async verifyEmail(req: HttpRequest) {
    const admin = this.user<User>(req);
    const user = await this.target(req);

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
      await this.audit(req, admin, user, 'user_verified_by_admin');
    }
    return this.ok(user, 'Email marked as verified.');
  }

  private async target(req: HttpRequest): Promise<User> {
    const id = Number(req.route('id'));
    return User.findOrFail(id);
  }

  private async revokeAccess(userId: number): Promise<void> {
    await AccessToken.destroyByUser(userId);
    await Promise.all([OAuthRefreshToken.destroyForUser(userId), OAuthCode.destroyForUser(userId)]);
  }

  /** Recorded on the target user's activity feed, with the acting admin in meta. */
  private audit(req: HttpRequest, admin: User, target: User, event: ActivityEvent) {
    return Activity.record(
      target.id,
      event,
      { ip: req.ip(), userAgent: req.userAgent() },
      { adminId: admin.id, adminEmail: admin.email },
    );
  }
}

export const adminUserController = new AdminUserController();
