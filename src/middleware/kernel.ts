import { throttle } from '../lib/core/ratelimit/index.js';
import { Middleware } from '../lib/core/routing/index.js';
import { adminOnly } from './admin.js';
import { authMiddleware } from './auth.js';
import { internalKey, internalNetwork } from './internal.js';
import { serviceAuth } from './service.js';
import './limiters.js';

Middleware.alias('auth', () => authMiddleware);
Middleware.alias('admin', () => adminOnly);
Middleware.alias('internal', () => internalNetwork);
Middleware.alias('internal-key', () => internalKey);
Middleware.alias('service', (...scopes) => serviceAuth(...scopes));
Middleware.alias('throttle', (limiter = '60', decay = '1') =>
  throttle(/^\d+$/.test(limiter) ? Number(limiter) : limiter, Number(decay)),
);

export {};
