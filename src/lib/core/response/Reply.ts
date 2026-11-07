import { resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { CookieOptions, Response } from 'express';
import type { Paginated } from '../query/types.js';

type Body =
  | { kind: 'empty' }
  | { kind: 'json'; value: unknown }
  | { kind: 'text'; value: string; type: string }
  | { kind: 'raw'; value: Buffer; type: string }
  | { kind: 'stream'; value: Readable; type: string }
  | { kind: 'redirect'; url: string }
  | { kind: 'download'; path: string; name?: string | undefined }
  | { kind: 'file'; path: string };

const serialize = (value: unknown): string => {
  const text = JSON.stringify(value ?? null, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)) as string | undefined;
  return text ?? 'null';
};

export class Reply {
  private code: number;
  private readonly headerBag: Record<string, string | string[]> = {};
  private readonly cookieBag: Array<{ name: string; value: string; options: CookieOptions }> = [];

  private constructor(
    private readonly body: Body,
    code: number,
  ) {
    this.code = Reply.checkStatus(code);
  }

  static json(data: unknown, status = 200): Reply {
    return new Reply({ kind: 'json', value: data }, status);
  }

  static success(data?: unknown, message = 'ok', status = 200): Reply {
    return Reply.json({ message, ...(data !== undefined && { data }) }, status);
  }

  static error(message: string, status = 400, errors?: Record<string, unknown>): Reply {
    return Reply.json({ message, ...(errors && { errors }) }, status);
  }

  static paginated(page: Paginated<unknown>, message = 'ok'): Reply {
    const { data, ...meta } = page;
    return Reply.json({ message, data, meta });
  }

  static text(text: string, status = 200): Reply {
    return new Reply({ kind: 'text', value: text, type: 'text/plain' }, status);
  }

  static html(html: string, status = 200): Reply {
    return new Reply({ kind: 'text', value: html, type: 'text/html' }, status);
  }

  static raw(data: Uint8Array, type = 'application/octet-stream', status = 200): Reply {
    return new Reply({ kind: 'raw', value: Buffer.from(data), type }, status);
  }

  static stream(stream: Readable, type = 'application/octet-stream', status = 200): Reply {
    return new Reply({ kind: 'stream', value: stream, type }, status);
  }

  static noContent(): Reply {
    return new Reply({ kind: 'empty' }, 204);
  }

  static redirect(url: string, status = 302): Reply {
    return new Reply({ kind: 'redirect', url }, status);
  }

  static download(path: string, name?: string): Reply {
    return new Reply({ kind: 'download', path: resolve(path), name }, 200);
  }

  static file(path: string): Reply {
    return new Reply({ kind: 'file', path: resolve(path) }, 200);
  }

  status(code: number): this {
    this.code = Reply.checkStatus(code);
    return this;
  }

  header(name: string, value: string | string[]): this {
    this.headerBag[name] = value;
    return this;
  }

  headers(values: Record<string, string | string[]>): this {
    Object.assign(this.headerBag, values);
    return this;
  }

  cookie(name: string, value: string, options: CookieOptions = {}): this {
    this.cookieBag.push({ name, value, options });
    return this;
  }

  async send(res: Response): Promise<void> {
    const { body } = this;

    res.status(this.code);
    for (const [name, value] of Object.entries(this.headerBag)) res.setHeader(name, value);
    for (const { name, value, options } of this.cookieBag) res.cookie(name, value, options);

    const typeIfUnset = (type: string) => {
      if (!res.getHeader('Content-Type')) res.type(type);
    };

    switch (body.kind) {
      case 'empty':
        res.end();
        return;
      case 'json':
        typeIfUnset('json');
        res.send(serialize(body.value));
        return;
      case 'text':
      case 'raw':
        typeIfUnset(body.type);
        res.send(body.value);
        return;
      case 'stream':
        typeIfUnset(body.type);
        await pipeline(body.value, res);
        return;
      case 'redirect':
        res.redirect(this.code, body.url);
        return;
      case 'download':
        await new Promise<void>((done, fail) => {
          const finish = (error?: Error | null) => (error && !res.headersSent ? fail(error) : done());
          if (body.name) res.download(body.path, body.name, finish);
          else res.download(body.path, finish);
        });
        return;
      case 'file':
        await new Promise<void>((done, fail) => {
          res.sendFile(body.path, (error?: Error | null) => (error && !res.headersSent ? fail(error) : done()));
        });
        return;
    }
  }

  private static checkStatus(code: number): number {
    if (!Number.isInteger(code) || code < 100 || code > 599) throw new RangeError(`Invalid HTTP status code: ${code}`);
    return code;
  }
}
