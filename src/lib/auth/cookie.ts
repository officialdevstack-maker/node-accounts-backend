import type { CookieOptions } from 'express';
import { config } from '../core/config/index.js';

export const AUTH_COOKIE_NAME = 'auth_token';

const domain = config('auth.cookieDomain');

export const authCookieOptions: CookieOptions = {
  path: '/',
  ...(domain ? { domain } : {}),
};
