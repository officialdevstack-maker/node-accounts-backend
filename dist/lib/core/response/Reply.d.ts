import type { Readable } from 'node:stream';
import type { CookieOptions, Response } from 'express';
import type { Paginated } from '../query/types.js';
export declare class Reply {
    private readonly body;
    private code;
    private readonly headerBag;
    private readonly cookieBag;
    private constructor();
    static json(data: unknown, status?: number): Reply;
    static success(data?: unknown, message?: string, status?: number): Reply;
    static error(message: string, status?: number, errors?: Record<string, unknown>): Reply;
    static paginated(page: Paginated<unknown>, message?: string): Reply;
    static text(text: string, status?: number): Reply;
    static html(html: string, status?: number): Reply;
    static raw(data: Uint8Array, type?: string, status?: number): Reply;
    static stream(stream: Readable, type?: string, status?: number): Reply;
    static noContent(): Reply;
    static redirect(url: string, status?: number): Reply;
    static download(path: string, name?: string): Reply;
    static file(path: string): Reply;
    status(code: number): this;
    header(name: string, value: string | string[]): this;
    headers(values: Record<string, string | string[]>): this;
    cookie(name: string, value: string, options?: CookieOptions): this;
    send(res: Response): Promise<void>;
    private static checkStatus;
}
//# sourceMappingURL=Reply.d.ts.map