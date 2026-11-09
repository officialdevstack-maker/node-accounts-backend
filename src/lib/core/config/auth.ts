// config/auth.ts  (Laravel: config/auth.php)
import { env } from './env.js';

const isProd = env.string('NODE_ENV') === 'production';

export const authConfig = {
  jwt: {
    // Required in production. In dev a throwaway default keeps `npm run dev` working.
    secret: isProd ? env.required('JWT_SECRET') : env.string('JWT_SECRET', 'dev-only-secret-change-me'),
    accessTtl: env.string('JWT_ACCESS_TTL', '15m'),
    refreshTtl: env.string('JWT_REFRESH_TTL', '30d'),
    issuer: env.string('JWT_ISSUER', env.string('APP_NAME', 'Spurs')),
  },

  bcryptRounds: env.number('BCRYPT_ROUNDS', 12),

  otp: {
    length: env.number('OTP_LENGTH', 6),
    ttlMinutes: env.number('OTP_TTL_MINUTES', 10),
    maxAttempts: env.number('OTP_MAX_ATTEMPTS', 5),
    resendSeconds: env.number('OTP_RESEND_SECONDS', 60),
  },

  tokens: {
    shortHours: env.number('TOKEN_TTL_HOURS', 2),
    rememberDays: env.number('TOKEN_REMEMBER_DAYS', 30),
  },

  cookieDomain: env.string('AUTH_COOKIE_DOMAIN') || undefined,

  passwordResetTtlMinutes: env.number('PASSWORD_RESET_TTL_MINUTES', 60),
};
