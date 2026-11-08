// config/app.ts  (Laravel: config/app.php)
import { env } from './env.js';
export const appConfig = {
    name: env.string('APP_NAME', 'Spurs'),
    env: env.oneOf('NODE_ENV', ['development', 'test', 'production'], 'development'),
    debug: env.bool('APP_DEBUG', env.string('NODE_ENV') !== 'production'),
    url: env.string('APP_URL', 'http://localhost:3000'),
    port: env.number('PORT', 3000),
    timezone: env.string('APP_TIMEZONE', 'Africa/Lagos'),
    currency: env.string('APP_CURRENCY', 'NGN'),
    /** Origins allowed by CORS, comma separated in .env */
    corsOrigins: env.list('CORS_ORIGINS', ['http://localhost:3000']),
};
//# sourceMappingURL=app.js.map