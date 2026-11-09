import { env } from './env.js';

const isProd = env.string('NODE_ENV') === 'production';

export const oidcConfig = {
  /** Must equal the "iss" third parties see. Discovery lives at <issuer>/.well-known/openid-configuration */
  issuer: env.string('OIDC_ISSUER', `${env.string('APP_URL', 'http://localhost:3000')}/api/oidc`),

  /** RSA private key (PEM, "\n" escapes allowed). Required in production. Dev auto-generates one at keyPath. */
  privateKey: isProd ? env.required('OIDC_PRIVATE_KEY') : env.string('OIDC_PRIVATE_KEY'),
  keyPath: env.string('OIDC_KEY_PATH', 'storage/oidc/private.pem'),
  /** Retired public keys, comma-separated. Keep each key for the maximum token lifetime after rotation. */
  retiredPublicKeys: env.list('OIDC_RETIRED_PUBLIC_KEYS'),

  accessTtl: env.number('OIDC_ACCESS_TTL', 600),
  idTokenTtl: env.number('OIDC_ID_TOKEN_TTL', 600),
  codeTtl: env.number('OIDC_CODE_TTL', 60),
  requestTtl: env.number('OIDC_REQUEST_TTL', 600),
  refreshTtlDays: env.number('OIDC_REFRESH_TTL_DAYS', 30),
  internalAudience: env.string('OIDC_INTERNAL_AUDIENCE', 'spurs-internal'),
  serviceTtl: env.number('OIDC_SERVICE_TTL', 900),

  scopes: ['openid', 'profile', 'email', 'phone', 'offline_access'] as string[],
  serviceScopes: ['users:read', 'users:introspect'] as string[],
};
