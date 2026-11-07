// middleware/errorHandler.ts
import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import HttpError from "../lib/error.js";
// import { HttpError } from "../errors/HttpError.js";

const isProd = process.env.NODE_ENV === "production";
type MysqlError = Error & { code?: string; sqlMessage?: string };
const isDuplicate = (error: unknown): error is MysqlError =>
  error instanceof Error && (error as MysqlError).code === "ER_DUP_ENTRY";

/**
 * Catch-all for any route that didn't match.
 * Must be registered AFTER all routes and BEFORE errorHandler.
 */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound(`Route ${req.method} ${req.originalUrl} not found.`));
}

/**
 * Global error handler (4 arguments is required for Express to treat it as one).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If headers are already sent, let Express close the connection
  if (res.headersSent) return next(err);

  let status = 500;
  let message = "Server error.";
  let errors: Record<string, unknown> | undefined;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    errors = err.errors;
  } else if (isDuplicate(err)) {
    status = 422;
    message = "Validation failed.";
    const key = err.sqlMessage?.match(/for key '(.+?)'/)?.[1]?.split(".").pop() ?? "field";
    errors = { [key]: `${key} already in use.` };
  } else if (err instanceof jwt.JsonWebTokenError) {
    status = 401;
    message = "Invalid or expired token.";
  } else if (err instanceof SyntaxError && "body" in (err as object)) {
    // malformed JSON body from express.json()
    status = 400;
    message = "Malformed JSON.";
  }

  if (status >= 500) {
    console.error(`[${req.method}] ${req.originalUrl}`, err);
  }

  res.status(status).json({
    message,
    ...(errors && { errors }),
    ...(!isProd && status >= 500 && err instanceof Error && { stack: err.stack }),
  });
}

/**
 * Wrap async route handlers so rejected promises reach errorHandler.
 * Only needed on Express 4. Express 5 does this automatically.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };
