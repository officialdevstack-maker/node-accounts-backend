import { CliError } from '../cli/index.js';
import { DatabaseCommand } from '../database/commands/DatabaseCommand.js';
import { config } from '../config/index.js';
import { OAuthClient } from '../../../models/OAuthClient.js';
import { randomToken, sha256 } from '../../oidc/util.js';

const list = (value: string | undefined) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

function validateUris(values: string[], option: string, allowLoopbackHttp = false): void {
  for (const value of values) {
    let uri: URL;
    try {
      uri = new URL(value);
    } catch {
      throw new CliError(`"${value}" is not a valid URL for --${option}.`);
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(uri.hostname);
    if (uri.protocol !== 'https:' && !(allowLoopbackHttp && uri.protocol === 'http:' && loopback)) {
      throw new CliError(`--${option} must use HTTPS${allowLoopbackHttp ? ' (except loopback HTTP)' : ''}.`);
    }
  }
}

export default class OidcClientCreateCommand extends DatabaseCommand {
  readonly signature =
    'oidc:client:create {name : App name} {--redirect= : Comma separated redirect URIs} {--logout-redirect= : Comma separated post-logout URIs} {--backchannel-logout= : Back-channel logout URI} {--scopes= : Comma separated allowed scopes} {--first-party : Skip the consent screen} {--public : No secret (browser or mobile apps)} {--client-credentials : Allow the client credentials grant} {--service : Internal service client (client credentials, first-party, confidential)}';
  readonly description = 'Register an OIDC client';

  async handle(): Promise<number> {
    const service = this.flag('service');
    const clientCredentialsEnabled = this.flag('client-credentials') || service;
    const isPublic = this.flag('public');
    const redirects = list(this.option('redirect'));
    if (service && isPublic) throw new CliError('A service needs a secret, so it cannot be --public.');
    if (!clientCredentialsEnabled && !redirects.length) throw new CliError('--redirect is required for authorization-code clients.');
    if (clientCredentialsEnabled && isPublic) {
      throw new CliError('--client-credentials requires a confidential client; remove --public.');
    }
    if (clientCredentialsEnabled && redirects.length) {
      throw new CliError('--redirect is not used for client-credentials clients.');
    }

    validateUris(redirects, 'redirect', true);
    const postLogoutRedirectUris = list(this.option('logout-redirect'));
    if (service && postLogoutRedirectUris.length) throw new CliError('--logout-redirect is not used for service clients.');
    validateUris(postLogoutRedirectUris, 'logout-redirect', true);

    const backchannelLogoutUri = this.option('backchannel-logout')?.trim() || null;
    if (service && backchannelLogoutUri) throw new CliError('--backchannel-logout is not used for service clients.');
    if (backchannelLogoutUri) validateUris([backchannelLogoutUri], 'backchannel-logout', true);

    const suppliedScopes = this.option('scopes');
    const serviceScopes = config('oidc.serviceScopes');
    const scopes = [...new Set(list(suppliedScopes ?? (
      service ? serviceScopes.join(',') : clientCredentialsEnabled ? '' : 'openid,profile,email'
    )))];
    if (clientCredentialsEnabled && (scopes.includes('openid') || scopes.includes('offline_access'))) {
      throw new CliError('Client-credentials scopes cannot include openid or offline_access.');
    }
    if (!scopes.length) throw new CliError('--scopes must include at least one scope.');
    const invalidScopes = scopes.filter((scope) => {
      if (!/^[\x21\x23-\x5B\x5D-\x7E]+$/.test(scope)) return true;
      if (service) return !serviceScopes.includes(scope);
      return !clientCredentialsEnabled && !config('oidc.scopes').includes(scope);
    });
    if (invalidScopes.length || (!clientCredentialsEnabled && !scopes.includes('openid'))) {
      const allowedScopes = service ? serviceScopes : config('oidc.scopes');
      throw new CliError(
        `--scopes must ${clientCredentialsEnabled ? 'contain valid OAuth scope tokens' : 'include openid and use only'}${service || !clientCredentialsEnabled ? `: ${allowedScopes.join(', ')}` : ''}.`,
      );
    }

    const secret = isPublic ? null : randomToken(32);
    const clientId = randomToken(18);
    const name = this.argument('name')!;
    await OAuthClient.create({
      clientId,
      secretHash: secret ? sha256(secret) : null,
      name,
      type: service || this.flag('first-party') ? 'first_party' : 'third_party',
      redirectUris: redirects,
      postLogoutRedirectUris,
      allowedScopes: scopes,
      backchannelLogoutUri,
      clientCredentialsEnabled,
      isActive: true,
    });

    this.success(`Client created: ${name}`);
    this.line(`client_id:     ${clientId}`);
    if (secret) {
      this.line(`client_secret: ${secret}`);
      this.warn('Store the secret now. Only its hash is saved.');
    }
    return 0;
  }
}
