import { env } from './env.js';

const isProd = env.string('NODE_ENV') === 'production';

export const oidcConfig = {
  /** Must equal the "iss" third parties see. Discovery lives at <issuer>/.well-known/openid-configuration */
  issuer: env.string('OIDC_ISSUER', `${env.string('APP_URL', 'http://localhost:3000')}/api/oidc`),

  /** RSA private key (PEM, "\n" escapes allowed). Required in production. Dev auto-generates one at keyPath. */
  privateKey: isProd ? env.required('OIDC_PRIVATE_KEY') : env.string('OIDC_PRIVATE_KEY'),
  keyPath: env.string('OIDC_KEY_PATH', 'storage/oidc/private.pem'),

  accessTtl: env.number('OIDC_ACCESS_TTL', 600),
  idTokenTtl: env.number('OIDC_ID_TOKEN_TTL', 600),
  codeTtl: env.number('OIDC_CODE_TTL', 60),
  requestTtl: env.number('OIDC_REQUEST_TTL', 600),
  refreshTtlDays: env.number('OIDC_REFRESH_TTL_DAYS', 30),

  scopes: ['openid', 'profile', 'email', 'phone', 'offline_access'] as string[],
};
