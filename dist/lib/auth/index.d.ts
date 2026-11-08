import type { NextFunction, Request, Response } from "express";
import { User } from "../../models/User.js";
export type Credentials = {
    email: string;
    password: string;
};
export declare class Guard {
    private readonly req;
    private readonly res;
    private _user;
    private _resolved;
    private _issuedToken;
    constructor(req: Request, res: Response);
    /** Reads the token from "Authorization: Bearer xxx", falling back to the cookie. */
    private extractToken;
    /** Creates a token row and returns the plain token (shown once, never stored). */
    createToken(user: User, remember?: boolean): Promise<string>;
    attempt({ email, password }: Credentials, remember?: boolean): Promise<boolean>;
    login(user: User, remember?: boolean): Promise<User | null>;
    /** The plain token created during this request (register/login). Null otherwise. */
    token(): string | null;
    user(): Promise<User | null>;
    check(): Promise<boolean>;
    guest(): Promise<boolean>;
    id(): Promise<number | null>;
    /** Revokes the current token (now async). */
    logout(): Promise<void>;
    /** Revokes every token the user has (log out of all devices). */
    logoutAll(): Promise<void>;
}
export declare class Auth {
    private static guard;
    static initialize(req: Request, res: Response, next: NextFunction): void;
    static attempt(credentials: Credentials, remember?: boolean): Promise<boolean>;
    static login(user: User, remember?: boolean): Promise<User | null>;
    static token(): string | null;
    static user(): Promise<User | null>;
    static check(): Promise<boolean>;
    static guest(): Promise<boolean>;
    static id(): Promise<number | null>;
    static logout(): Promise<void>;
    static logoutAll(): Promise<void>;
}
export default Auth;
//# sourceMappingURL=index.d.ts.map