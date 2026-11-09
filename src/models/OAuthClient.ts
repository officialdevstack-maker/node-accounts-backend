import { Model, type Cast } from '../lib/core/model/index.js';
import { safeEqual, sha256 } from '../lib/oidc/util.js';

export type ClientType = 'first_party' | 'third_party';

export class OAuthClient extends Model {
  static table = 'oauth_clients';
  static fillable = [
    'clientId', 'secretHash', 'name', 'description', 'logoUri', 'type',
    'redirectUris', 'postLogoutRedirectUris', 'allowedScopes', 'backchannelLogoutUri',
    'clientCredentialsEnabled', 'isActive',
  ];
  static hidden = ['secretHash'];
  static casts: Record<string, Cast> = {
    id: 'int',
    redirectUris: 'json',
    postLogoutRedirectUris: 'json',
    allowedScopes: 'json',
    clientCredentialsEnabled: 'boolean',
    isActive: 'boolean',
    createdAt: 'date',
    updatedAt: 'date',
  };

  declare id: number;
  declare clientId: string;
  declare secretHash: string | null;
  declare name: string;
  declare description: string | null;
  declare logoUri: string | null;
  declare type: ClientType;
  declare redirectUris: string[];
  declare postLogoutRedirectUris: string[];
  declare allowedScopes: string[];
  declare backchannelLogoutUri: string | null;
  declare clientCredentialsEnabled: boolean;
  declare isActive: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;

  static findByClientId(clientId: string) {
    return OAuthClient.query().withHidden().where('client_id', clientId).first();
  }

  isFirstParty(): boolean {
    return this.type === 'first_party';
  }

  isConfidential(): boolean {
    return Boolean(this.getHidden('secretHash'));
  }

  allowsRedirect(uri: string): boolean {
    return this.redirectUris.includes(uri);
  }

  verifySecret(secret: string): boolean {
    const stored = this.getHidden('secretHash');
    return typeof stored === 'string' && safeEqual(stored, sha256(secret));
  }
}
