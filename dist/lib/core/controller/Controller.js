// controller/Controller.ts
// Base class for files in src/controllers. Generate one with:  artisan make:controller Wallet --resource
import HttpError from '../../error.js';
import { Reply } from '../response/index.js';
import Validator from '../validation/Validator.js';
export class Controller {
    // ---- input -----------------------------------------------------------------------------
    /** Validates and returns the clean data, or throws HttpError 422 (the error handler formats it). */
    validate(req, rules, options = {}) {
        const source = options.source ?? 'body';
        const data = source === 'query' ? req.query() : source === 'params' ? req.params : req.body;
        return Validator.validate(data, rules, options.messages, options.attributes);
    }
    /** The authenticated user (set by the auth middleware). Throws 401 when there is none. */
    user(req) {
        if (!req.user)
            throw HttpError.unauthorized();
        return req.user;
    }
    /** ?page= and ?per_page= as safe numbers, ready for query.paginate(perPage, page). */
    pageParams(req, options = {}) {
        const max = options.maxPerPage ?? 100;
        const page = Math.trunc(Number(req.query('page'))) || 1;
        const perPage = Math.trunc(Number(req.query('per_page'))) || (options.perPage ?? 15);
        return { page: Math.max(1, page), perPage: Math.min(max, Math.max(1, perPage)) };
    }
    // ---- output (return these from your methods) -------------------------------------------
    ok(data, message = 'ok') {
        return Reply.success(data, message);
    }
    created(data, message = 'created') {
        return Reply.success(data, message, 201);
    }
    noContent() {
        return Reply.noContent();
    }
    /** Sends the result of query.paginate() as { message, data, meta }. */
    paginated(page, message = 'ok') {
        return Reply.paginated(page, message);
    }
    // ---- errors ---------------------------------------------------------------------------
    /** Throws an HttpError. Typed `never`, so code after it knows the branch ended. */
    abort(status, message, errors) {
        throw new HttpError(status, message, errors);
    }
    abortIf(condition, status, message, errors) {
        if (condition)
            this.abort(status, message, errors);
    }
}
//# sourceMappingURL=Controller.js.map