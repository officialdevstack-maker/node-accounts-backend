import { throttle } from '../lib/core/ratelimit/index.js';
import { Middleware } from '../lib/core/routing/index.js';
import { authMiddleware } from './auth.js';
import './limiters.js';

Middleware.alias('auth', () => authMiddleware);
Middleware.alias('throttle', (limiter = '60', decay = '1') =>
  throttle(/^\d+$/.test(limiter) ? Number(limiter) : limiter, Number(decay)),
);

export {};
