import type { NextFunction, Request, Response } from 'express';
import HttpError from '../lib/error.js';

export function adminOnly(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) return next(HttpError.forbidden('Admin access required.'));
  next();
}
