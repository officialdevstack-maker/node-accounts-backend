// app/Auth/Auth.ts
import { AsyncLocalStorage } from "async_hooks";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { WhereOptions } from "sequelize";

import { User } from "../../models/User.js";
import { SESSION_KEY as JWT_SECRET } from "../../config/env.js";

if (!JWT_SECRET) {
  throw new Error("SESSION_KEY is not set in config/env");
}

const SECRET: string = JWT_SECRET;
const COOKIE_NAME = "auth_token";
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

export type Credentials = {
  password: string;
  [field: string]: unknown;
};

const storage = new AsyncLocalStorage<Guard>();

/**
 * Per-request guard. One instance is created for every request.
 */
export class Guard {
  private _user: User | null = null;
  private _resolved = false;

  constructor(
    private readonly req: Request,
    private readonly res: Response
  ) {}

  // Auth.attempt({ email, password }, remember)
  async attempt(credentials: Credentials, remember = false): Promise<boolean> {
    const { password, ...where } = credentials;
    const user = await User.scope("withPassword").findOne({
      where: where as WhereOptions,
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return false;
    }

    await this.login(user, remember);
    return true;
  }

  // Auth.login(user, remember)
  async login(user: User, remember = false): Promise<User | null> {
    const expiresIn = (
      remember
        ? process.env.JWT_REMEMBER_EXPIRES_IN || "30d"
        : process.env.JWT_EXPIRES_IN || "2h"
    ) as SignOptions["expiresIn"];

    const token = jwt.sign({ sub: String(user.id) }, SECRET, { expiresIn });

    this.res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: remember ? REMEMBER_MS : undefined, // session cookie if not remembered
    });

    this._user = await User.findByPk(user.id); // fresh copy without password
    this._resolved = true;
    return this._user;
  }

  // Auth.user()
  async user(): Promise<User | null> {
    if (this._resolved) return this._user;
    this._resolved = true;

    const token: string | undefined = this.req.cookies?.[COOKIE_NAME];
    if (!token) return null;

    try {
      const payload = jwt.verify(token, SECRET) as JwtPayload;
      this._user = payload.sub ? await User.findByPk(Number(payload.sub)) : null;
    } catch {
      this._user = null;
    }
    return this._user;
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

  // Auth.logout()
  logout(): void {
    this.res.clearCookie(COOKIE_NAME);
    this._user = null;
    this._resolved = true;
  }
}

/**
 * Static facade, so you can write Auth.user() anywhere during a request.
 */
export class Auth {
  private static guard(): Guard {
    const guard = storage.getStore();
    if (!guard) {
      throw new Error("Auth used outside a request. Did you register Auth.initialize?");
    }
    return guard;
  }

  // Register once in app.ts: app.use(Auth.initialize)
  static initialize(req: Request, res: Response, next: NextFunction): void {
    const guard = new Guard(req, res);
    req.auth = guard; // also available as req.auth
    storage.run(guard, next);
  }

  static attempt(credentials: Credentials, remember?: boolean) {
    return Auth.guard().attempt(credentials, remember);
  }
  static login(user: User, remember?: boolean) {
    return Auth.guard().login(user, remember);
  }
  static user() { return Auth.guard().user(); }
  static check() { return Auth.guard().check(); }
  static guest() { return Auth.guard().guest(); }
  static id() { return Auth.guard().id(); }
  static logout() { return Auth.guard().logout(); }
}

export default Auth;