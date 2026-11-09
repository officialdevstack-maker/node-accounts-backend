import jwt from 'jsonwebtoken';
import { DB } from '../core/query/index.js';
import { config } from '../core/config/index.js';
import { signingKey } from './keys.js';
import { randomToken } from './util.js';

const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';
const TIMEOUT_MS = 3000;

export async function notifyBackchannelLogout(userId: number): Promise<void> {
  let clients: Array<{ clientId: string; uri: string }>;
  let key: ReturnType<typeof signingKey>;
  try {
    const rows = await DB.table('oauth_grants as g')
      .join('oauth_clients as c', 'c.id', 'g.oauth_client_id')
      .where('g.user_id', userId)
      .where('c.is_active', true)
      .whereNotNull('c.backchannel_logout_uri')
      .select('c.client_id as client_id', 'c.backchannel_logout_uri as uri')
      .get();
    clients = rows.map((row) => ({ clientId: String(row['client_id']), uri: String(row['uri']) }));
    key = signingKey();
  } catch (error) {
    console.error('Could not prepare back-channel logout notifications.', error);
    return;
  }

  await Promise.all(clients.map(async (client) => {
    const { clientId, uri } = client;
    try {
      const logoutToken = jwt.sign(
        { events: { [LOGOUT_EVENT]: {} }, jti: randomToken(16) },
        key.privatePem,
        {
          algorithm: 'RS256',
          header: { alg: 'RS256', typ: 'logout+jwt', kid: key.kid },
          issuer: config('oidc.issuer'),
          audience: clientId,
          subject: String(userId),
          expiresIn: config('oidc.accessTtl'),
        },
      );
      const response = await fetch(uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ logout_token: logoutToken }),
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        console.error(`Back-channel logout failed for client ${clientId} with status ${response.status}.`);
      }
    } catch (error) {
      console.error(`Back-channel logout failed for client ${clientId}.`, error);
    }
  }));
}
