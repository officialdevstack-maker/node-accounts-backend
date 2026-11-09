// lib/auth/index.ts
import { AsyncLocalStorage } from "async_hooks";
import { createHash, randomBytes } from "crypto";
import type { NextFunction, Request, Response } from "express";

import { config } from "../core/config/index.js";
import { User } from "../../models/User.js";
import { AccessToken } from "../../models/AccessToken.js";
import { Activity, type ActivityContext } from "../../models/Activity.js";
import { describeDevice } from "./device.js";
import { notifyOnLogin } from "./alerts.js";
import { AUTH_COOKIE_NAME, authCookieOptions } from "./cookie.js";
import { notifyBackchannelLogoutAfterResponse } from "../oidc/response-logout.js";
import { verifyPassword } from "./password.js";

const SHORT_MS = config("auth.tokens.shortHours") * 60 * 60 * 1000;
const REMEMBER_MS = config("auth.tokens.rememberDays") * 24 * 60 * 60 * 1000;

export type Credentials = { email: string; password: string };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const storage = new AsyncLocalStorage<Guard>();

export class Guard {
  private _user: User | null = null;
  private _resolved = false;
  private _issuedToken: string | null = null; // plain token, only exists on the request that created it
  private _tokenId: number | null = null;

  constructor(
    private readonly req: Request,
    private readonly res: Response
  ) {}

  private context(): ActivityContext {
    return { ip: this.req.ip, userAgent: this.req.get("user-agent") };
  }

  /** Reads the token from "Authorization: Bearer xxx", falling back to the cookie. */
  private extractToken(): string | null {
    const header = this.req.headers.authorization;
    if (header?.startsWith("Bearer ")) return header.slice(7).trim() || null;
    return this.req.cookies?.[AUTH_COOKIE_NAME] ?? null;
  }

  /** Creates a token row and returns the plain token (shown once, never stored). */
  async createToken(user: User, remember = false): Promise<string> {
    const plain = randomBytes(40).toString("hex");
    const userAgent = this.req.get("user-agent")?.slice(0, 255);

    const record = await AccessToken.issue({
      userId: user.id,
      tokenHash: sha256(plain),
      expiresAt: new Date(Date.now() + (remember ? REMEMBER_MS : SHORT_MS)),
      deviceName: describeDevice(userAgent),
      ipAddress: this.req.ip ?? null,
      userAgent: userAgent ?? null,
    });
    this._tokenId = record.id;

    return plain;
  }

  async attempt({ email, password }: Credentials, remember = false): Promise<boolean> {
    const user = await User.findByEmailWithPassword(email);
    if (!user) {
      await verifyPassword(password, undefined);
      return false;
    }
    if (!(await verifyPassword(password, String(user.getHidden("password"))))) return false;

    await this.login(user, remember);
    return true;
  }

  async login(user: User, remember = false): Promise<User | null> {
    const userAgent = this.req.get("user-agent")?.slice(0, 255);
    const token = await this.createToken(user, remember);
    this._issuedToken = token;

    // Optional: also set a cookie for browser clients. Remove if you only use Bearer tokens.
    this.res.cookie(AUTH_COOKIE_NAME, token, {
      ...authCookieOptions,
      httpOnly: true,
      sameSite: "lax",
      secure: config("app.env") === "production",
      maxAge: remember ? REMEMBER_MS : undefined,
    });

    this._user = await User.find(user.id);
    this._resolved = true;

    if (this._user) {
      const ctx = this.context();
      await notifyOnLogin(this._user, ctx);
      void Activity.record(this._user.id, "login", ctx);
    }

    return this._user;
  }

  /** The plain token created during this request (register/login). Null otherwise. */
  token(): string | null {
    return this._issuedToken;
  }

  async user(): Promise<User | null> {
    if (this._resolved) return this._user;
    this._resolved = true;

    const plain = this.extractToken();
    if (!plain) return null;

    const record = await AccessToken.findValid(sha256(plain));
    if (!record) return null;

    this._tokenId = record.id;
    this._user = await User.find(record.userId);
    if (this._user?.suspendedAt) this._user = null;
    if (this._user) void AccessToken.touch(record.id).catch(() => {});
    return this._user;
  }

  currentTokenId(): number | null {
    return this._tokenId;
  }

  async check(): Promise<boolean> {
    return (await this.user()) !== null;
  }

  async guest(): Promise<boolean> {
    return !(await this.check());
  }

  async id(): Promise<number | null> {
    const user = await this.user();
    return user ? user.id : null;
  }

  /** Revokes the current token (now async). */
  async logout(): Promise<void> {
    const user = await this.user();
    const plain = this.extractToken();
    if (plain) await AccessToken.destroyByHash(sha256(plain));
    if (user) {
      notifyBackchannelLogoutAfterResponse(this.res, user.id);
      await Activity.record(user.id, "logout", { ip: this.req.ip, userAgent: this.req.get("user-agent") });
    }

    this.res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
    this._user = null;
    this._issuedToken = null;
    this._resolved = true;
  }

  /** Revokes every token the user has (log out of all devices). */
  async logoutAll(): Promise<void> {
    const id = await this.id();
    if (id) {
      notifyBackchannelLogoutAfterResponse(this.res, id);
      await AccessToken.destroyByUser(id);
      await Activity.record(id, "logout_all", { ip: this.req.ip, userAgent: this.req.get("user-agent") });
    }

    this.res.clearCookie(AUTH_COOKIE_NAME, authCookieOptions);
    this._user = null;
    this._resolved = true;
  }
}

export class Auth {
  private static guard(): Guard {
    const guard = storage.getStore();
    if (!guard) throw new Error("Auth used outside a request. Did you register Auth.initialize?");
    return guard;
  }

  static initialize(req: Request, res: Response, next: NextFunction): void {
    const guard = new Guard(req, res);
    req.auth = guard;
    storage.run(guard, next);
  }

  static attempt(credentials: Credentials, remember?: boolean) { return Auth.guard().attempt(credentials, remember); }
  static login(user: User, remember?: boolean) {
    return Auth.guard().login(user, remember);
  }
  static token() { return Auth.guard().token(); }
  static user() { return Auth.guard().user(); }
  static check() { return Auth.guard().check(); }
  static guest() { return Auth.guard().guest(); }
  static id() { return Auth.guard().id(); }
  static logout() { return Auth.guard().logout(); }
  static logoutAll() { return Auth.guard().logoutAll(); }
}

export default Auth;