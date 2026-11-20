import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { OidcClientRegistrationError, registerOidcClient, validateOidcClientSettings } from '../lib/oidc/register-client.js';
import { OAuthClient } from '../models/OAuthClient.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class InternalOidcClientController extends Controller {
  async index() {
    const clients = await OAuthClient.query().withHidden().orderBy('created_at', 'desc').get();
    return this.ok(clients.map((client) => this.present(client)));
  }

  async show(req: HttpRequest) {
    const client = await this.client(req);
    return this.ok(this.present(client));
  }

  async store(req: HttpRequest) {
    this.requireAuditHeaders(req);
    const body = this.body(req);
    if (typeof body.name !== 'string') this.abort(422, 'App name is required.');

    try {
      const client = await registerOidcClient({
        name: body.name,
        redirectUris: this.stringArray(body.redirectUris, 'redirectUris'),
        postLogoutRedirectUris: this.stringArray(body.postLogoutRedirectUris, 'postLogoutRedirectUris'),
        backchannelLogoutUri: this.optionalString(body.backchannelLogoutUri, 'backchannelLogoutUri'),
        scopes: body.scopes === undefined ? undefined : this.stringArray(body.scopes, 'scopes'),
        firstParty: this.optionalBoolean(body.firstParty, 'firstParty'),
        public: this.optionalBoolean(body.public, 'public'),
        clientCredentials: this.optionalBoolean(body.clientCredentials, 'clientCredentials'),
        service: this.optionalBoolean(body.service, 'service'),
      });
      return this.created(client);
    } catch (error) {
      if (error instanceof OidcClientRegistrationError) this.abort(422, error.message);
      throw error;
    }
  }

  async update(req: HttpRequest) {
    this.requireAuditHeaders(req);
    const client = await this.client(req);
    const body = this.body(req);
    const name = body.name === undefined ? client.name : body.name;
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      this.abort(422, 'App name must be between 1 and 120 characters.');
    }

    const redirectUris = body.redirectUris === undefined
      ? client.redirectUris
      : this.stringArray(body.redirectUris, 'redirectUris');
    const postLogoutRedirectUris = body.postLogoutRedirectUris === undefined
      ? client.postLogoutRedirectUris
      : this.stringArray(body.postLogoutRedirectUris, 'postLogoutRedirectUris');
    const scopes = body.scopes === undefined
      ? client.allowedScopes
      : [...new Set(this.stringArray(body.scopes, 'scopes'))];
    const backchannelLogoutUri = body.backchannelLogoutUri === undefined
      ? client.backchannelLogoutUri
      : this.optionalString(body.backchannelLogoutUri, 'backchannelLogoutUri') ?? null;
    const firstParty = body.firstParty === undefined
      ? client.isFirstParty()
      : this.optionalBoolean(body.firstParty, 'firstParty');
    const isActive = body.isActive === undefined
      ? client.isActive
      : this.optionalBoolean(body.isActive, 'isActive');

    try {
      validateOidcClientSettings({
        redirectUris,
        postLogoutRedirectUris,
        backchannelLogoutUri,
        scopes,
        clientCredentialsEnabled: client.clientCredentialsEnabled,
      });
    } catch (error) {
      if (error instanceof OidcClientRegistrationError) this.abort(422, error.message);
      throw error;
    }

    const before = this.present(client);
    await client.update({
      name: name.trim(),
      redirectUris,
      postLogoutRedirectUris,
      allowedScopes: scopes,
      backchannelLogoutUri,
      type: firstParty ? 'first_party' : 'third_party',
      isActive,
    });
    return this.ok({ before, client: this.present(client) });
  }

  async destroy(req: HttpRequest) {
    this.requireAuditHeaders(req);
    const client = await this.client(req);
    const before = this.present(client);
    if (client.isActive) await client.update({ isActive: false });
    return this.ok({ before, client: this.present(client) });
  }

  private async client(req: HttpRequest): Promise<OAuthClient> {
    const clientId = req.route('clientId') ?? '';
    const client = await OAuthClient.query().withHidden().where('client_id', clientId).first();
    if (!client) this.abort(404, 'OIDC client not found.');
    return client;
  }

  private body(req: HttpRequest): Record<string, unknown> {
    if (!isRecord(req.body)) this.abort(422, 'Invalid request body.');
    return req.body;
  }

  private stringArray(value: unknown, key: string): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
      this.abort(422, `${key} must be an array of strings.`);
    }
    return value.map((entry) => entry.trim()).filter(Boolean);
  }

  private optionalString(value: unknown, key: string): string | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value !== 'string') this.abort(422, `${key} must be a string.`);
    return value;
  }

  private optionalBoolean(value: unknown, key: string): boolean {
    if (typeof value !== 'boolean') this.abort(422, `${key} must be a boolean.`);
    return value;
  }

  private requireAuditHeaders(req: HttpRequest): void {
    const reason = req.header('x-admin-audit-reason')?.trim() ?? '';
    const requestId = req.header('x-admin-request-id')?.trim() ?? '';
    this.abortIf(
      reason.length < 3 || reason.length > 1000 || !requestId || requestId.length > 128,
      400,
      'An audit reason and request ID are required.',
    );
  }

  private present(client: OAuthClient) {
    return {
      clientId: client.clientId,
      name: client.name,
      description: client.description,
      logoUri: client.logoUri,
      type: client.type,
      isConfidential: client.isConfidential(),
      redirectUris: client.redirectUris,
      postLogoutRedirectUris: client.postLogoutRedirectUris,
      allowedScopes: client.allowedScopes,
      backchannelLogoutUri: client.backchannelLogoutUri,
      clientCredentialsEnabled: client.clientCredentialsEnabled,
      isActive: client.isActive,
      lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }
}

export const internalOidcClientController = new InternalOidcClientController();
