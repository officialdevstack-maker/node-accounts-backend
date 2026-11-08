// errors/HttpError.ts
export class HttpError extends Error {
    status;
    errors;
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors;
        this.name = "HttpError";
        Error.captureStackTrace?.(this, this.constructor);
    }
    static badRequest(message = "Bad request.", errors) {
        return new HttpError(400, message, errors);
    }
    static unauthorized(message = "Unauthenticated.") {
        return new HttpError(401, message);
    }
    static forbidden(message = "Forbidden.") {
        return new HttpError(403, message);
    }
    static notFound(message = "Not found.") {
        return new HttpError(404, message);
    }
    static unprocessable(message = "Validation failed.", errors) {
        return new HttpError(422, message, errors);
    }
}
export default HttpError;
//# sourceMappingURL=error.js.map