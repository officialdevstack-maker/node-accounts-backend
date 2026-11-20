import { config } from '../core/config/index.js';
import { OAuthClient } from '../../models/OAuthClient.js';
import { randomToken, sha256 } from './util.js';

export type OidcClientRegistration = {
  name: string;
  redirectUris?: string[] | undefined;
  postLogoutRedirectUris?: string[] | undefined;
  backchannelLogoutUri?: string | null | undefined;
  scopes?: string[] | undefined;
  firstParty?: boolean | undefined;
  public?: boolean | undefined;
  clientCredentials?: boolean | undefined;
  service?: boolean | undefined;
};

export class OidcClientRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OidcClientRegistrationError';
  }
}

function validateUris(values: string[], option: string, allowLoopbackHttp = false): void {
  for (const value of values) {
    let uri: URL;
    try {
      uri = new URL(value);
    } catch {
      throw new OidcClientRegistrationError(`"${value}" is not a valid URL for ${option}.`);
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname);
    if (uri.protocol !== 'https:' && !(allowLoopbackHttp && uri.protocol === 'http:' && loopback)) {
      throw new OidcClientRegistrationError(`${option} must use HTTPS${allowLoopbackHttp ? ' (except loopback HTTP)' : ''}.`);
    }
  }
}

export function validateOidcClientSettings(input: {
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  backchannelLogoutUri: string | null;
  scopes: string[];
  clientCredentialsEnabled: boolean;
  service?: boolean;
}) {
  const serviceScopes = config('oidc.serviceScopes');
  if (input.clientCredentialsEnabled && (input.scopes.includes('openid') || input.scopes.includes('offline_access'))) {
    throw new OidcClientRegistrationError('Client-credentials scopes cannot include openid or offline_access.');
  }
  if (!input.scopes.length) throw new OidcClientRegistrationError('At least one scope is required.');
  const invalidScopes = input.scopes.filter((scope) => {
    if (!/^[\x21\x23-\x5B\x5D-\x7E]+$/.test(scope)) return true;
    if (input.service) return !serviceScopes.includes(scope);
    return !input.clientCredentialsEnabled && !config('oidc.scopes').includes(scope);
  });
  if (invalidScopes.length || (!input.clientCredentialsEnabled && !input.scopes.includes('openid'))) {
    const allowedScopes = input.service ? serviceScopes : config('oidc.scopes');
    throw new OidcClientRegistrationError(
      `Scopes must ${input.clientCredentialsEnabled ? 'contain valid OAuth scope tokens' : 'include openid and use only'}${input.service || !input.clientCredentialsEnabled ? `: ${allowedScopes.join(', ')}` : ''}.`,
    );
  }

  validateUris(input.redirectUris, 'Redirect URI', true);
  if (input.service && input.postLogoutRedirectUris.length) {
    throw new OidcClientRegistrationError('Post-logout redirect URIs are not used for service clients.');
  }
  validateUris(input.postLogoutRedirectUris, 'Post-logout redirect URI', true);
  if (input.service && input.backchannelLogoutUri) {
    throw new OidcClientRegistrationError('Back-channel logout URI is not used for service clients.');
  }
  if (input.backchannelLogoutUri) validateUris([input.backchannelLogoutUri], 'Back-channel logout URI', true);

  if (!input.clientCredentialsEnabled && !input.redirectUris.length) {
    throw new OidcClientRegistrationError('At least one redirect URI is required for authorization-code clients.');
  }
  if (input.clientCredentialsEnabled && input.redirectUris.length) {
    throw new OidcClientRegistrationError('Redirect URIs are not used for client-credentials clients.');
  }

  return input;
}

export async function registerOidcClient(input: OidcClientRegistration) {
  const service = input.service === true;
  const clientCredentialsEnabled = input.clientCredentials === true || service;
  const isPublic = input.public === true;
  const redirects = input.redirectUris ?? [];
  const postLogoutRedirectUris = input.postLogoutRedirectUris ?? [];
  const backchannelLogoutUri = input.backchannelLogoutUri?.trim() || null;

  if (!input.name.trim() || input.name.trim().length > 120) {
    throw new OidcClientRegistrationError('App name must be between 1 and 120 characters.');
  }
  if (service && isPublic) throw new OidcClientRegistrationError('A service needs a secret, so it cannot be public.');
  if (clientCredentialsEnabled && isPublic) {
    throw new OidcClientRegistrationError('Client-credentials clients must be confidential.');
  }

  const scopes = [...new Set(input.scopes ?? (
    service ? config('oidc.serviceScopes') : clientCredentialsEnabled ? [] : ['openid', 'profile', 'email']
  ))];
  const settings = validateOidcClientSettings({
    redirectUris: redirects,
    postLogoutRedirectUris,
    backchannelLogoutUri,
    scopes,
    clientCredentialsEnabled,
    service,
  });

  const clientSecret = isPublic ? null : randomToken(32);
  const clientId = randomToken(18);
  await OAuthClient.create({
    clientId,
    secretHash: clientSecret ? sha256(clientSecret) : null,
    name: input.name.trim(),
    type: service || input.firstParty ? 'first_party' : 'third_party',
    redirectUris: settings.redirectUris,
    postLogoutRedirectUris: settings.postLogoutRedirectUris,
    allowedScopes: settings.scopes,
    backchannelLogoutUri: settings.backchannelLogoutUri,
    clientCredentialsEnabled,
    isActive: true,
  });

  return { clientId, clientSecret, name: input.name.trim(), scopes, isActive: true };
}
