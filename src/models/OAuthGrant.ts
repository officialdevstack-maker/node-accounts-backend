import { Model, type Cast } from '../lib/core/model/index.js';
import { DB } from '../lib/core/query/index.js';
import { scopeLabels } from '../lib/oidc/claims.js';
import { parseJson } from '../lib/oidc/util.js';

export class OAuthGrant extends Model {
  static table = 'oauth_grants';
  static fillable = ['userId', 'oauthClientId', 'scopes'];
  static casts: Record<string, Cast> = {
    id: 'int',
    userId: 'int',
    oauthClientId: 'int',
    scopes: 'json',
    lastUsedAt: 'date',
    createdAt: 'date',
    updatedAt: 'date',
  };

  declare id: number;
  declare userId: number;
  declare oauthClientId: number;
  declare scopes: string[];
  declare lastUsedAt: Date | null;
  declare createdAt: Date;
  declare updatedAt: Date;

  static forUserAndClient(userId: number, clientRef: number) {
    return OAuthGrant.where('user_id', userId).where('oauth_client_id', clientRef).first();
  }

  static async grant(userId: number, clientRef: number, scopes: string[]): Promise<{ grant: OAuthGrant; created: boolean }> {
    const existing = await OAuthGrant.forUserAndClient(userId, clientRef);
    if (!existing) {
      return { grant: await OAuthGrant.create({ userId, oauthClientId: clientRef, scopes }), created: true };
    }

    const merged = [...new Set([...existing.scopes, ...scopes])];
    if (merged.length !== existing.scopes.length) await existing.update({ scopes: merged });
    return { grant: existing, created: false };
  }

  static async touch(id: number): Promise<void> {
    await DB.table(OAuthGrant.tableName()).where('id', id).update({ last_used_at: new Date() });
  }

  static revoke(id: number, userId: number): Promise<number> {
    return DB.table(OAuthGrant.tableName()).where('id', id).where('user_id', userId).delete();
  }

  static async forUserWithClients(userId: number) {
    const rows = await DB.table('oauth_grants as g')
      .join('oauth_clients as c', 'c.id', 'g.oauth_client_id')
      .where('g.user_id', userId)
      .orderByDesc('g.updated_at')
      .select(
        'g.id as id',
        'g.scopes as scopes',
        'g.created_at as created_at',
        'g.last_used_at as last_used_at',
        'c.name as name',
        'c.description as description',
        'c.logo_uri as logo_uri',
        'c.type as type',
      )
      .get();

    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      description: row.description ?? null,
      logoUri: row.logo_uri ?? null,
      type: row.type as 'first_party' | 'third_party',
      permissions: scopeLabels(parseJson<string[]>(row.scopes)),
      connectedAt: row.created_at,
      lastUsedAt: row.last_used_at ?? null,
    }));
  }
}
