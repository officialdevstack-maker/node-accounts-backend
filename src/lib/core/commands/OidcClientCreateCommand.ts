import { CliError } from '../cli/index.js';
import { DatabaseCommand } from '../database/commands/DatabaseCommand.js';
import { registerOidcClient, OidcClientRegistrationError } from '../../oidc/register-client.js';

const list = (value: string | undefined) => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export default class OidcClientCreateCommand extends DatabaseCommand {
  readonly signature =
    'oidc:client:create {name : App name} {--redirect= : Comma separated redirect URIs} {--logout-redirect= : Comma separated post-logout URIs} {--backchannel-logout= : Back-channel logout URI} {--scopes= : Comma separated allowed scopes} {--first-party : Skip the consent screen} {--public : No secret (browser or mobile apps)} {--client-credentials : Allow the client credentials grant} {--service : Internal service client (client credentials, first-party, confidential)}';
  readonly description = 'Register an OIDC client';

  async handle(): Promise<number> {
    const service = this.flag('service');
    let registered: Awaited<ReturnType<typeof registerOidcClient>>;
    try {
      registered = await registerOidcClient({
        name: this.argument('name')!,
        redirectUris: list(this.option('redirect')),
        postLogoutRedirectUris: list(this.option('logout-redirect')),
        backchannelLogoutUri: this.option('backchannel-logout'),
        scopes: this.option('scopes') === undefined ? undefined : list(this.option('scopes')),
        firstParty: this.flag('first-party'),
        public: this.flag('public'),
        clientCredentials: this.flag('client-credentials'),
        service,
      });
    } catch (error) {
      if (error instanceof OidcClientRegistrationError) throw new CliError(error.message);
      throw error;
    }

    this.success(`Client created: ${registered.name}`);
    this.line(`client_id:     ${registered.clientId}`);
    if (registered.clientSecret) {
      this.line(`client_secret: ${registered.clientSecret}`);
      this.warn('Store the secret now. Only its hash is saved.');
    }
    return 0;
  }
}
