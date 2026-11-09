import { DB } from '../lib/core/query/index.js';
import { parseJson, randomToken, sha256 } from '../lib/oidc/util.js';

const TABLE = 'oauth_codes';

export interface CodeRow {
  grantId: number;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  nonce: string | null;
  authTime: Date;
}

export type CodeResult =
  | { status: 'missing' | 'expired' }
  | { status: 'replayed'; grantId: number }
  | { status: 'ok'; code: CodeRow };

async function issue(
  input: { grantId: number; redirectUri: string; scopes: string[]; codeChallenge: string; nonce: string | undefined; authTime: Date },
  ttlSeconds: number,
): Promise<string> {
  const code = randomToken(32);
  const now = new Date();

  await DB.table(TABLE).where('expires_at', '<', new Date(now.getTime() - 3_600_000)).delete();
  await DB.table(TABLE).insert({
    grant_id: input.grantId,
    code_hash: sha256(code),
    redirect_uri: input.redirectUri,
    scopes: input.scopes,
    code_challenge: input.codeChallenge,
    nonce: input.nonce ?? null,
    auth_time: input.authTime,
    expires_at: new Date(now.getTime() + ttlSeconds * 1000),
    created_at: now,
  });
  return code;
}

async function consume(code: string): Promise<CodeResult> {
  const row = await DB.table(TABLE).where('code_hash', sha256(code)).first();
  if (!row) return { status: 'missing' };

  const grantId = Number(row.grant_id);
  const claimed = await DB.table(TABLE).where('id', row.id).whereNull('used_at').update({ used_at: new Date() });
  if (claimed === 0) return { status: 'replayed', grantId };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { status: 'expired' };

  return {
    status: 'ok',
    code: {
      grantId,
      redirectUri: String(row.redirect_uri),
      scopes: parseJson<string[]>(row.scopes),
      codeChallenge: String(row.code_challenge),
      nonce: row.nonce ?? null,
      authTime: new Date(row.auth_time),
    },
  };
}

export const OAuthCode = { issue, consume };
