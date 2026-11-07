// controller/Controller.ts
// Base class for files in src/controllers. Generate one with:  artisan make:controller Wallet --resource
import type { Request } from 'express';
import HttpError from '../../error.js';
import { Reply } from '../response/index.js';
import type { Paginated } from '../query/types.js';
import type { Attributes, Data, Messages, Rules } from '../validation/types.js';
import Validator from '../validation/Validator.js';

export interface ValidateOptions {
  /** Where the data comes from (default: body). */
  source?: 'body' | 'query' | 'params';
  messages?: Messages;
  attributes?: Attributes;
}

export interface PageOptions {
  /** Default page size (default 15). */
  perPage?: number;
  /** Upper limit for ?per_page= (default 100). */
  maxPerPage?: number;
}

export abstract class Controller {
  // ---- input -----------------------------------------------------------------------------
  /** Validates and returns the clean data, or throws HttpError 422 (the error handler formats it). */
  protected validate<T = Data>(req: Request, rules: Rules, options: ValidateOptions = {}): Promise<T> {
    const data = (req[options.source ?? 'body'] ?? {}) as Data;
    return Validator.validate<T>(data, rules, options.messages, options.attributes);
  }

  /** The authenticated user (set by the auth middleware). Throws 401 when there is none. */
  protected user<T = any>(req: Request): T {
    if (!req.user) throw HttpError.unauthorized();
    return req.user as T;
  }

  /** ?page= and ?per_page= as safe numbers, ready for query.paginate(perPage, page). */
  protected pageParams(req: Request, options: PageOptions = {}): { page: number; perPage: number } {
    const max = options.maxPerPage ?? 100;
    const page = Math.trunc(Number(req.query.page)) || 1;
    const perPage = Math.trunc(Number(req.query.per_page)) || (options.perPage ?? 15);

    return { page: Math.max(1, page), perPage: Math.min(max, Math.max(1, perPage)) };
  }

  // ---- output (return these from your methods) -------------------------------------------
  protected ok(data?: unknown, message = 'ok'): Reply {
    return Reply.success(data, message);
  }

  protected created(data?: unknown, message = 'created'): Reply {
    return Reply.success(data, message, 201);
  }

  protected noContent(): Reply {
    return Reply.noContent();
  }

  /** Sends the result of query.paginate() as { message, data, meta }. */
  protected paginated(page: Paginated<unknown>, message = 'ok'): Reply {
    return Reply.paginated(page, message);
  }

  // ---- errors ---------------------------------------------------------------------------
  /** Throws an HttpError. Typed `never`, so code after it knows the branch ended. */
  protected abort(status: number, message: string, errors?: Record<string, unknown>): never {
    throw new HttpError(status, message, errors);
  }

  protected abortIf(condition: unknown, status: number, message: string, errors?: Record<string, unknown>): void {
    if (condition) this.abort(status, message, errors);
  }
}
