import type { NextFunction, Request, Response } from 'express';
import Auth from '../lib/auth/index.js';
import { ServiceProvider } from '../lib/core/boot/index.js';

export class AuthServiceProvider extends ServiceProvider {
  middleware(): void {
    this.app.express.use((req: Request, res: Response, next: NextFunction) => Auth.initialize(req, res, next));
  }
}
