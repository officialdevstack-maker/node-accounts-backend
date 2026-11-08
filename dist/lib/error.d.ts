export declare class HttpError extends Error {
    readonly status: number;
    readonly errors?: Record<string, unknown> | undefined;
    constructor(status: number, message: string, errors?: Record<string, unknown> | undefined);
    static badRequest(message?: string, errors?: Record<string, unknown>): HttpError;
    static unauthorized(message?: string): HttpError;
    static forbidden(message?: string): HttpError;
    static notFound(message?: string): HttpError;
    static unprocessable(message?: string, errors?: Record<string, unknown>): HttpError;
}
export default HttpError;
//# sourceMappingURL=error.d.ts.map