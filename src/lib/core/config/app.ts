// config/app.ts  (Laravel: config/app.php)
import { env } from './env.js';

const nodeEnv = env.string('NODE_ENV');
const isProd = nodeEnv === 'production';
const url = env.string('APP_URL', 'http://localhost:3000');
const frontendUrl = isProd ? env.required('FRONTEND_URL') : env.string('FRONTEND_URL', 'http://localhost:5173');
const corsOrigins = env.list('CORS_ORIGINS', isProd ? [] : ['http://localhost:3000']);

if (/^https:\/\//i.test(url) && !isProd) {
  throw new Error('APP_URL must not use https outside production.');
}
if (isProd && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must contain at least one origin in production.');
}
if (isProd && corsOrigins.includes('*')) {
  throw new Error('CORS_ORIGINS must not contain "*" in production.');
}

function trustProxy(): boolean | number | string {
  const value = env.string('TRUST_PROXY', isProd ? '1' : 'false').toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(value)) return value === '1' ? 1 : true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;
  const hops = Number(value);
  return Number.isInteger(hops) && hops >= 0 ? hops : value;
}

export const appConfig = {
  name: env.string('APP_NAME', 'Spurs'),
  env: env.oneOf('NODE_ENV', ['development', 'test', 'production'] as const, 'development'),
  debug: env.bool('APP_DEBUG', env.string('NODE_ENV') !== 'production'),
  url,
  frontendUrl,
  key: env.string('APP_KEY', ''),
  port: env.number('PORT', 3000),
  trustProxy: trustProxy(),
  timezone: env.string('APP_TIMEZONE', 'Africa/Lagos'),
  currency: env.string('APP_CURRENCY', 'NGN'),
  /** Origins allowed by CORS, comma separated in .env */
  corsOrigins,
};
