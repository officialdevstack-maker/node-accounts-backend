import type { NextFunction, Request, RequestHandler, Response } from "express";
/**
 * Catch-all for any route that didn't match.
 * Must be registered AFTER all routes and BEFORE errorHandler.
 */
export declare function notFound(req: Request, _res: Response, next: NextFunction): void;
/**
 * Global error handler (4 arguments is required for Express to treat it as one).
 */
export declare function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void;
/**
 * Wrap async route handlers so rejected promises reach errorHandler.
 * Only needed on Express 4. Express 5 does this automatically.
 */
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => RequestHandler;
//# sourceMappingURL=error.d.ts.map