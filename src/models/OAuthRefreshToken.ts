import { DB } from '../lib/core/query/index.js';
import { config } from '../lib/core/config/index.js';
import { parseJson, randomToken, sha256 } from '../lib/oidc/util.js';

const TABLE = 'oauth_refresh_tokens';

export type RotateResult =
  | { status: 'invalid' }
  | { status: 'duplicate' }
  | { status: 'reused'; grantId: number }
  | { status: 'ok'; token: string; grantId: number; scopes: string[]; authTime: Date };

const DUPLICATE_WINDOW_MS = 10_000;

function replayStatus(usedAt: unknown, grantId: number): RotateResult {
  const timestamp = new Date(usedAt as string | number | Date).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp >= 0 && Date.now() - timestamp <= DUPLICATE_WINDOW_MS
    ? { status: 'duplicate' }
    : { status: 'reused', grantId };
}

async function issue(input: { grantId: number; scopes: string[]; authTime: Date }, ttlDays: number): Promise<string> {
  const token = randomToken(40);
  const now = new Date();

  await DB.table(TABLE).where('expires_at', '<', now).delete();
  await DB.table(TABLE).insert({
    grant_id: input.grantId,
    token_hash: sha256(token),
    scopes: input.scopes,
    auth_time: input.authTime,
    expires_at: new Date(now.getTime() + ttlDays * 86_400_000),
    created_at: now,
  });
  return token;
}

async function rotate(token: string): Promise<RotateResult> {
  const row = await DB.table(TABLE).where('token_hash', sha256(token)).first();
  if (!row) return { status: 'invalid' };

  const grantId = Number(row.grant_id);
  if (row.used_at) return replayStatus(row.used_at, grantId);
  if (new Date(row.expires_at).getTime() <= Date.now()) return { status: 'invalid' };

  const claimed = await DB.table(TABLE).where('id', row.id).whereNull('used_at').update({ used_at: new Date() });
  if (claimed === 0) {
    const updated = await DB.table(TABLE).where('id', row.id).first();
    return updated?.used_at ? replayStatus(updated.used_at, grantId) : { status: 'invalid' };
  }

  const scopes = parseJson<string[]>(row.scopes);
  const authTime = new Date(row.auth_time);
  const next = await issue({ grantId, scopes, authTime }, config('oidc.refreshTtlDays'));
  return { status: 'ok', token: next, grantId, scopes, authTime };
}

async function destroyForGrant(grantId: number): Promise<void> {
  await DB.table(TABLE).where('grant_id', grantId).delete();
}

async function destroyByToken(token: string, clientRef: number): Promise<void> {
  const row = await DB.table(TABLE).where('token_hash', sha256(token)).first();
  if (!row) return;

  const grant = await DB.table('oauth_grants').where('id', row.grant_id).first();
  if (grant && Number(grant.oauth_client_id) === clientRef) await DB.table(TABLE).where('id', row.id).delete();
}

export const OAuthRefreshToken = { issue, rotate, destroyForGrant, destroyByToken };
