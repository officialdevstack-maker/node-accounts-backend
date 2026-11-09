import jwt from 'jsonwebtoken';
import { OAuthClient } from '../../models/OAuthClient.js';
import { config } from '../core/config/index.js';
import { OidcError, RedirectableError } from './errors.js';
import { str } from './util.js';

export interface AuthorizeParams {
  client: OAuthClient;
  redirectUri: string;
  scopes: string[];
  state: string | undefined;
  nonce: string | undefined;
  codeChallenge: string;
  prompt: string[];
  maxAge?: number;
  loginHint?: string;
}

/** Validates the /authorize query. Order matters: client + redirect_uri first (errors are shown to the user), the rest are redirected to the app. */
export async function parseAuthorizeRequest(query: Record<string, unknown>): Promise<AuthorizeParams> {
  const clientId = str(query.client_id);
  if (!clientId) throw new OidcError('invalid_request', 'Missing client_id.');

  const client = await OAuthClient.findByClientId(clientId);
  if (!client || !client.isActive) {
    throw new OidcError('unauthorized_client', 'This application is not registered or has been disabled.');
  }

  const redirectUri = str(query.redirect_uri);
  if (!redirectUri || !client.allowsRedirect(redirectUri)) {
    throw new OidcError('invalid_request', 'The redirect_uri does not match one registered for this application.');
  }

  const state = str(query.state);
  const fail = (code: string, description: string) => new RedirectableError(code, description, redirectUri, state);

  if (query.request !== undefined || query.request_uri !== undefined) {
    throw fail('request_not_supported', 'Request objects are not supported.');
  }
  if (str(query.response_type) !== 'code') {
    throw fail('unsupported_response_type', 'Only response_type=code is supported.');
  }

  const scopes = [...new Set((str(query.scope) ?? '').split(/\s+/).filter(Boolean))];
  if (!scopes.includes('openid')) throw fail('invalid_scope', 'The openid scope is required.');

  const rejected = scopes.filter((s) => !config('oidc.scopes').includes(s) || !client.allowedScopes.includes(s));
  if (rejected.length) throw fail('invalid_scope', `Scope not allowed for this application: ${rejected.join(', ')}.`);

  const codeChallenge = str(query.code_challenge);
  if (!codeChallenge || str(query.code_challenge_method) !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) {
    throw fail('invalid_request', 'PKCE is required: send code_challenge (S256) and code_challenge_method=S256.');
  }

  const prompt = (str(query.prompt) ?? '').split(/\s+/).filter(Boolean);
  const validPrompts = new Set(['none', 'login', 'consent']);
  if (prompt.some((value) => !validPrompts.has(value)) || (prompt.includes('none') && prompt.length > 1)) {
    throw fail('invalid_request', 'prompt must contain supported values; none cannot be combined with another value.');
  }

  const hasMaxAge = query.max_age !== undefined;
  const maxAgeValue = hasMaxAge ? str(query.max_age) : undefined;
  const maxAge = maxAgeValue === undefined ? undefined : Number(maxAgeValue);
  if (
    hasMaxAge &&
    (maxAgeValue === undefined ||
      !/^\d+$/.test(maxAgeValue) ||
      maxAge === undefined ||
      !Number.isSafeInteger(maxAge) ||
      maxAge < 0)
  ) {
    throw fail('invalid_request', 'max_age must be a non-negative integer.');
  }
  const loginHint = str(query.login_hint);
  if (loginHint && loginHint.length > 255) throw fail('invalid_request', 'login_hint is too long.');

  return {
    client,
    redirectUri,
    scopes,
    state,
    nonce: str(query.nonce),
    codeChallenge,
    prompt,
    ...(maxAge !== undefined ? { maxAge } : {}),
    ...(loginHint ? { loginHint } : {}),
  };
}

const KEEP = [
  'client_id', 'redirect_uri', 'response_type', 'scope', 'state', 'nonce',
  'code_challenge', 'code_challenge_method', 'prompt', 'max_age', 'login_hint',
] as const;

export function signRequest(query: Record<string, unknown>): string {
  const q = Object.fromEntries(KEEP.flatMap((key) => {
    const value = str(query[key]);
    return value === undefined ? [] : [[key, value]];
  }));

  return jwt.sign({ purpose: 'oidc_request', q }, config('auth.jwt.secret'), {
    algorithm: 'HS256',
    expiresIn: config('oidc.requestTtl'),
  });
}

export function readRequest(token: string): Record<string, unknown> {
  try {
    const payload = jwt.verify(token, config('auth.jwt.secret'), { algorithms: ['HS256'] });
    if (typeof payload === 'string' || payload['purpose'] !== 'oidc_request') throw new Error('wrong token');
    return payload['q'] as Record<string, unknown>;
  } catch {
    throw new OidcError('invalid_request', 'This authorization request has expired. Please go back to the app and try again.');
  }
}
