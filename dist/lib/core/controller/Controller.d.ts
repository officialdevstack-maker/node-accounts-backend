import type { HttpRequest } from '../request/index.js';
import { Reply } from '../response/index.js';
import type { Paginated } from '../query/types.js';
import type { Attributes, Data, Messages, Rules } from '../validation/types.js';
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
export declare abstract class Controller {
    /** Validates and returns the clean data, or throws HttpError 422 (the error handler formats it). */
    protected validate<T = Data>(req: HttpRequest, rules: Rules, options?: ValidateOptions): Promise<T>;
    /** The authenticated user (set by the auth middleware). Throws 401 when there is none. */
    protected user<T = any>(req: HttpRequest): T;
    /** ?page= and ?per_page= as safe numbers, ready for query.paginate(perPage, page). */
    protected pageParams(req: HttpRequest, options?: PageOptions): {
        page: number;
        perPage: number;
    };
    protected ok(data?: unknown, message?: string): Reply;
    protected created(data?: unknown, message?: string): Reply;
    protected noContent(): Reply;
    /** Sends the result of query.paginate() as { message, data, meta }. */
    protected paginated(page: Paginated<unknown>, message?: string): Reply;
    /** Throws an HttpError. Typed `never`, so code after it knows the branch ended. */
    protected abort(status: number, message: string, errors?: Record<string, unknown>): never;
    protected abortIf(condition: unknown, status: number, message: string, errors?: Record<string, unknown>): void;
}
//# sourceMappingURL=Controller.d.ts.map