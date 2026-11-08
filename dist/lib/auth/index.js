// lib/auth/index.ts
import { AsyncLocalStorage } from "async_hooks";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { config } from "../core/config/index.js";
import { User } from "../../models/User.js";
import { AccessToken } from "../../models/AccessToken.js";
const COOKIE_NAME = "auth_token";
const SHORT_MS = config("auth.tokens.shortHours") * 60 * 60 * 1000;
const REMEMBER_MS = config("auth.tokens.rememberDays") * 24 * 60 * 60 * 1000;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const storage = new AsyncLocalStorage();
export class Guard {
    req;
    res;
    _user = null;
    _resolved = false;
    _issuedToken = null; // plain token, only exists on the request that created it
    constructor(req, res) {
        this.req = req;
        this.res = res;
    }
    /** Reads the token from "Authorization: Bearer xxx", falling back to the cookie. */
    extractToken() {
        const header = this.req.headers.authorization;
        if (header?.startsWith("Bearer "))
            return header.slice(7).trim() || null;
        return this.req.cookies?.[COOKIE_NAME] ?? null;
    }
    /** Creates a token row and returns the plain token (shown once, never stored). */
    async createToken(user, remember = false) {
        const plain = randomBytes(40).toString("hex");
        await AccessToken.create({
            userId: user.id,
            tokenHash: sha256(plain),
            expiresAt: new Date(Date.now() + (remember ? REMEMBER_MS : SHORT_MS)),
        });
        return plain;
    }
    async attempt({ email, password }, remember = false) {
        const user = await User.findByEmailWithPassword(email);
        if (!user || !(await bcrypt.compare(password, user.password)))
            return false;
        await this.login(user, remember);
        return true;
    }
    async login(user, remember = false) {
        const token = await this.createToken(user, remember);
        this._issuedToken = token;
        // Optional: also set a cookie for browser clients. Remove if you only use Bearer tokens.
        this.res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: remember ? REMEMBER_MS : undefined,
        });
        this._user = await User.findById(user.id);
        this._resolved = true;
        return this._user;
    }
    /** The plain token created during this request (register/login). Null otherwise. */
    token() {
        return this._issuedToken;
    }
    async user() {
        if (this._resolved)
            return this._user;
        this._resolved = true;
        const plain = this.extractToken();
        if (!plain)
            return null;
        const record = await AccessToken.findValid(sha256(plain));
        if (!record)
            return null;
        this._user = await User.findById(record.userId);
        if (this._user)
            void AccessToken.touch(record.id).catch(() => { });
        return this._user;
    }
    async check() {
        return (await this.user()) !== null;
    }
    async guest() {
        return !(await this.check());
    }
    async id() {
        const user = await this.user();
        return user ? user.id : null;
    }
    /** Revokes the current token (now async). */
    async logout() {
        const plain = this.extractToken();
        if (plain)
            await AccessToken.destroyByHash(sha256(plain));
        this.res.clearCookie(COOKIE_NAME);
        this._user = null;
        this._issuedToken = null;
        this._resolved = true;
    }
    /** Revokes every token the user has (log out of all devices). */
    async logoutAll() {
        const id = await this.id();
        if (id)
            await AccessToken.destroyByUser(id);
        this.res.clearCookie(COOKIE_NAME);
        this._user = null;
        this._resolved = true;
    }
}
export class Auth {
    static guard() {
        const guard = storage.getStore();
        if (!guard)
            throw new Error("Auth used outside a request. Did you register Auth.initialize?");
        return guard;
    }
    static initialize(req, res, next) {
        const guard = new Guard(req, res);
        req.auth = guard;
        storage.run(guard, next);
    }
    static attempt(credentials, remember) { return Auth.guard().attempt(credentials, remember); }
    static login(user, remember) { return Auth.guard().login(user, remember); }
    static token() { return Auth.guard().token(); }
    static user() { return Auth.guard().user(); }
    static check() { return Auth.guard().check(); }
    static guest() { return Auth.guard().guest(); }
    static id() { return Auth.guard().id(); }
    static logout() { return Auth.guard().logout(); }
    static logoutAll() { return Auth.guard().logoutAll(); }
}
export default Auth;
//# sourceMappingURL=index.js.map