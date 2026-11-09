import jwt from 'jsonwebtoken';
import { Activity, type ActivityContext } from '../../models/Activity.js';
import { OAuthClient } from '../../models/OAuthClient.js';
import { OAuthCode } from '../../models/OAuthCode.js';
import { OAuthGrant } from '../../models/OAuthGrant.js';
import { OAuthRefreshToken } from '../../models/OAuthRefreshToken.js';
import { User } from '../../models/User.js';
import { config } from '../core/config/index.js';
import type { AuthorizeParams } from './authorize-request.js';
import { claimsFor, type Claims } from './claims.js';
import { OidcError } from './errors.js';
import { signingKey } from './keys.js';
import { signAccessToken, signIdToken, verifyAccessToken } from './tokens.js';
import { pkceChallenge, safeEqual, str, withParams } from './util.js';

export function errorRedirect(redirectUri: string, state: string | undefined, error: string, description?: string): string {
  return withParams(redirectUri, { error, error_description: description, state, iss: config('oidc.issuer') });
}

export async function needsConsent(user: Pick<User, 'id'>, params: AuthorizeParams): Promise<boolean> {
  if (params.client.isFirstParty()) return false;
  if (params.prompt.includes('consent')) return true;

  const grant = await OAuthGrant.forUserAndClient(user.id, params.client.id);
  return !grant || params.scopes.some((scope) => !grant.scopes.includes(scope));
}

export async function grantAccess(
  user: Pick<User, 'id'>,
  params: AuthorizeParams,
  authTime: Date,
  context: ActivityContext,
): Promise<string> {
  const { grant, created } = await OAuthGrant.grant(user.id, params.client.id, params.scopes);
  if (created) {
    await Activity.record(user.id, 'app_connected', context, { app: params.client.name });
  }

  const code = await OAuthCode.issue(
    {
      grantId: grant.id,
      redirectUri: params.redirectUri,
      scopes: params.scopes,
      codeChallenge: params.codeChallenge,
      nonce: params.nonce,
      authTime,
    },
    config('oidc.codeTtl'),
  );

  return withParams(params.redirectUri, { code, state: params.state, iss: config('oidc.issuer') });
}

export async function authenticateClient(authorization: string | undefined, body: Record<string, unknown>): Promise<OAuthClient> {
  let clientId = str(body.client_id);
  let secret = str(body.client_secret);

  try {
    if (authorization?.toLowerCase().startsWith('basic ')) {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
      const split = decoded.indexOf(':');
      if (split > 0) {
        clientId = decodeURIComponent(decoded.slice(0, split));
        secret = decodeURIComponent(decoded.slice(split + 1));
      }
    }
  } catch {
    throw new OidcError('invalid_client', 'Malformed client credentials.', 401);
  }

  const client = clientId ? await OAuthClient.findByClientId(clientId) : null;
  if (!client || !client.isActive) throw new OidcError('invalid_client', 'Unknown client.', 401);

  if (client.isConfidential() && (!secret || !client.verifySecret(secret))) {
    throw new OidcError('invalid_client', 'Invalid client credentials.', 401);
  }
  return client;
}

const wantsRefresh = (client: OAuthClient, scopes: string[]) => client.isFirstParty() || scopes.includes('offline_access');

async function respond(input: {
  user: User;
  client: OAuthClient;
  grantId: number;
  scopes: string[];
  authTime: Date;
  nonce?: string | undefined;
  refreshToken?: string | undefined;
}): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    access_token: signAccessToken({
      userId: input.user.id,
      clientId: input.client.clientId,
      grantId: input.grantId,
      scopes: input.scopes,
    }),
    token_type: 'Bearer',
    expires_in: config('oidc.accessTtl'),
    scope: input.scopes.join(' '),
  };

  if (input.scopes.includes('openid')) {
    body.id_token = signIdToken({
      user: input.user,
      clientId: input.client.clientId,
      scopes: input.scopes,
      nonce: input.nonce,
      authTime: input.authTime,
    });
  }
  if (input.refreshToken) body.refresh_token = input.refreshToken;

  void OAuthGrant.touch(input.grantId).catch(() => {});
  return body;
}

const invalidGrant = (description: string) => new OidcError('invalid_grant', description);

export async function exchangeCode(client: OAuthClient, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const code = str(body.code);
  const redirectUri = str(body.redirect_uri);
  const verifier = str(body.code_verifier);
  if (!code || !redirectUri || !verifier) {
    throw new OidcError('invalid_request', 'code, redirect_uri and code_verifier are required.');
  }
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) throw invalidGrant('Malformed code_verifier.');

  const result = await OAuthCode.consume(code);
  if (result.status === 'replayed') {
    await OAuthRefreshToken.destroyForGrant(result.grantId);
    throw invalidGrant('Authorization code was already used.');
  }
  if (result.status !== 'ok') throw invalidGrant('Invalid or expired authorization code.');

  const row = result.code;
  if (row.redirectUri !== redirectUri) throw invalidGrant('redirect_uri does not match the authorization request.');
  if (!safeEqual(pkceChallenge(verifier), row.codeChallenge)) throw invalidGrant('PKCE verification failed.');

  const grant = await OAuthGrant.find(row.grantId);
  if (!grant || grant.oauthClientId !== client.id) throw invalidGrant('Grant not found.');

  const user = await User.find(grant.userId);
  if (!user) throw invalidGrant('User not found.');

  const refreshToken = wantsRefresh(client, row.scopes)
    ? await OAuthRefreshToken.issue({ grantId: grant.id, scopes: row.scopes, authTime: row.authTime }, config('oidc.refreshTtlDays'))
    : undefined;

  return respond({
    user,
    client,
    grantId: grant.id,
    scopes: row.scopes,
    authTime: row.authTime,
    nonce: row.nonce ?? undefined,
    refreshToken,
  });
}

export async function refreshTokens(client: OAuthClient, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const token = str(body.refresh_token);
  if (!token) throw new OidcError('invalid_request', 'refresh_token is required.');

  const result = await OAuthRefreshToken.rotate(token);
  if (result.status === 'reused') {
    await OAuthRefreshToken.destroyForGrant(result.grantId);
    throw invalidGrant('Refresh token reuse detected. Sign in again.');
  }
  if (result.status !== 'ok') throw invalidGrant('Invalid or expired refresh token.');

  const grant = await OAuthGrant.find(result.grantId);
  if (!grant || grant.oauthClientId !== client.id) throw invalidGrant('Grant not found.');

  const user = await User.find(grant.userId);
  if (!user) throw invalidGrant('User not found.');

  let scopes = result.scopes;
  const requested = str(body.scope)?.split(/\s+/).filter(Boolean);
  if (requested) {
    if (requested.some((scope) => !result.scopes.includes(scope))) {
      throw new OidcError('invalid_scope', 'Requested scope exceeds the original grant.');
    }
    scopes = requested;
  }

  return respond({
    user,
    client,
    grantId: grant.id,
    scopes,
    authTime: result.authTime,
    refreshToken: result.token,
  });
}

export async function userinfo(token: string | null | undefined): Promise<Claims | null> {
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) return null;

  const grant = await OAuthGrant.find(claims.gid);
  if (!grant || String(grant.userId) !== claims.sub) return null;

  const user = await User.find(grant.userId);
  if (!user) return null;

  void OAuthGrant.touch(grant.id).catch(() => {});
  return claimsFor(user, claims.scopes);
}

export async function resolveLogout(query: Record<string, unknown>): Promise<string | null> {
  const hint = str(query.id_token_hint);
  if (!hint) throw new OidcError('invalid_request', 'id_token_hint is required to sign out.');

  let audience: string | undefined;
  try {
    const payload = jwt.verify(hint, signingKey().publicPem, {
      algorithms: ['RS256'],
      issuer: config('oidc.issuer'),
      ignoreExpiration: true,
    });
    if (typeof payload !== 'string' && typeof payload.aud === 'string') audience = payload.aud;
  } catch {
    throw new OidcError('invalid_request', 'The id_token_hint is not valid.');
  }

  const client = audience ? await OAuthClient.findByClientId(audience) : null;
  if (!client) throw new OidcError('invalid_request', 'The id_token_hint is not valid.');

  const target = str(query.post_logout_redirect_uri);
  if (!target) return null;
  if (!client.postLogoutRedirectUris.includes(target)) {
    throw new OidcError('invalid_request', 'post_logout_redirect_uri is not registered for this application.');
  }
  return withParams(target, { state: str(query.state) });
}

export function discoveryDocument() {
  const issuer = config('oidc.issuer');
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    userinfo_endpoint: `${issuer}/userinfo`,
    jwks_uri: `${issuer}/jwks`,
    revocation_endpoint: `${issuer}/revoke`,
    end_session_endpoint: `${issuer}/logout`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: config('oidc.scopes'),
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256'],
    prompt_values_supported: ['none', 'consent'],
    claims_supported: ['sub', 'name', 'account_type', 'email', 'email_verified', 'phone_number', 'auth_time', 'nonce'],
    authorization_response_iss_parameter_supported: true,
    request_parameter_supported: false,
  };
}
