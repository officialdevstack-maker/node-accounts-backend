import { Controller, type HttpRequest } from '../lib/core/controller/index.js';
import { randomToken, sha256 } from '../lib/oidc/util.js';
import { OAuthClient } from '../models/OAuthClient.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const merchantDescription = (merchantId: string) => `spurs-pay-merchant:${merchantId}`;

class InternalPayMerchantClientController extends Controller {
  async store(req: HttpRequest) {
    const merchantId = this.merchantId(req);
    this.requireAuditHeaders(req);
    const { name } = await this.validate<{ name: string }>(req, {
      name: 'required|string|min:2|max:120',
    });
    const description = merchantDescription(merchantId);
    if (await OAuthClient.where('description', description).first()) {
      this.abort(409, 'A Pay merchant client already exists.');
    }

    const clientId = randomToken(18);
    const clientSecret = randomToken(32);
    await OAuthClient.create({
      clientId,
      secretHash: sha256(clientSecret),
      name: name.trim(),
      description,
      type: 'first_party',
      redirectUris: [],
      postLogoutRedirectUris: [],
      allowedScopes: ['pay:checkout'],
      backchannelLogoutUri: null,
      clientCredentialsEnabled: true,
      isActive: true,
    });

    return this.created({ clientId, clientSecret, isActive: true, lastUsedAt: null });
  }

  async show(req: HttpRequest) {
    const merchantId = this.merchantId(req);
    const client = await this.clientForMerchant(merchantId);
    return this.ok({
      clientId: client.clientId,
      isActive: client.isActive,
      lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
    });
  }

  async rotate(req: HttpRequest) {
    const merchantId = this.merchantId(req);
    this.requireAuditHeaders(req);
    const client = await this.clientForMerchant(merchantId);
    this.abortIf(!client.isActive, 409, 'Revoked credentials cannot be rotated.');

    const clientSecret = randomToken(32);
    await client.update({ secretHash: sha256(clientSecret) });
    return this.ok({ clientId: client.clientId, clientSecret });
  }

  async revoke(req: HttpRequest) {
    const merchantId = this.merchantId(req);
    this.requireAuditHeaders(req);
    const client = await this.clientForMerchant(merchantId);
    if (client.isActive) await client.update({ isActive: false });
    return this.ok({ clientId: client.clientId, isActive: false });
  }

  private merchantId(req: HttpRequest): string {
    const merchantId = req.route('merchantId') ?? '';
    this.abortIf(!uuid.test(merchantId), 404, 'Pay merchant not found.');
    return merchantId;
  }

  private requireAuditHeaders(req: HttpRequest): void {
    const reason = req.header('x-admin-audit-reason')?.trim() ?? '';
    const requestId = req.header('x-admin-request-id')?.trim() ?? '';
    this.abortIf(
      !reason || reason.length > 1000 || !requestId || requestId.length > 128,
      400,
      'An audit reason and request ID are required.',
    );
  }

  private async clientForMerchant(merchantId: string): Promise<OAuthClient> {
    const client = await OAuthClient.where('description', merchantDescription(merchantId)).first();
    if (!client) this.abort(404, 'Pay merchant credentials not found.');
    this.abortIf(!client.clientCredentialsEnabled || !client.allowedScopes.includes('pay:checkout'), 404, 'Pay merchant credentials not found.');
    return client;
  }
}

export const internalPayMerchantClientController = new InternalPayMerchantClientController();
