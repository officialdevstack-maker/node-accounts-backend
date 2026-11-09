import Auth from '../lib/auth/index.js';
import { config } from '../lib/core/config/index.js';
import { Controller, Reply, type HttpRequest } from '../lib/core/controller/index.js';
import { parseAuthorizeRequest, readRequest, signRequest } from '../lib/oidc/authorize-request.js';
import { scopeLabels } from '../lib/oidc/claims.js';
import { OidcError, RedirectableError } from '../lib/oidc/errors.js';
import { publicJwks } from '../lib/oidc/keys.js';
import {
  authenticateClient,
  discoveryDocument,
  errorRedirect,
  exchangeCode,
  grantAccess,
  needsConsent,
  refreshTokens,
  resolveLogout,
  userinfo,
} from '../lib/oidc/provider.js';
import { str } from '../lib/oidc/util.js';
import { AccessToken } from '../models/AccessToken.js';
import { OAuthRefreshToken } from '../models/OAuthRefreshToken.js';
import type { User } from '../models/User.js';

const NO_STORE = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };

class OidcController extends Controller {
  discovery() {
    return Reply.json(discoveryDocument()).header('Cache-Control', 'public, max-age=3600');
  }

  jwks() {
    return Reply.json(publicJwks()).header('Cache-Control', 'public, max-age=300');
  }

  async authorize(req: HttpRequest) {
    try {
      const params = await parseAuthorizeRequest(req.query());
      const user = await Auth.user();
      const frontend = config('app.frontendUrl');

      if (!user) {
        if (params.prompt.includes('none')) {
          throw new RedirectableError('login_required', 'The user is not signed in.', params.redirectUri, params.state);
        }
        return Reply.redirect(`${frontend}/login?return_to=${encodeURIComponent(req.raw.originalUrl)}`);
      }

      if (await needsConsent(user, params)) {
        if (params.prompt.includes('none')) {
          throw new RedirectableError('consent_required', 'The user has not approved this app.', params.redirectUri, params.state);
        }
        return Reply.redirect(`${frontend}/consent?request=${encodeURIComponent(signRequest(req.query()))}`);
      }

      return Reply.redirect(await grantAccess(user, params, await this.authTime(req), this.context(req)));
    } catch (error) {
      return this.browserFailure(error);
    }
  }

  async consentShow(req: HttpRequest) {
    const user = this.user<User>(req);
    const { client, scopes } = await this.resolveRequest(req.query('request'));

    return this.ok({
      client: { name: client.name, description: client.description, logoUri: client.logoUri },
      permissions: scopeLabels(scopes),
      user: { fullname: user.fullname, email: user.email },
    });
  }

  async consentStore(req: HttpRequest) {
    const user = this.user<User>(req);
    const data = await this.validate<{ request: string; approve: boolean }>(req, {
      request: 'required|string',
      approve: 'required|boolean',
    });
    const params = await this.resolveRequest(data.request);

    if (!data.approve) {
      return this.ok({
        redirect: errorRedirect(params.redirectUri, params.state, 'access_denied', 'The user denied the request.'),
      });
    }

    return this.ok({ redirect: await grantAccess(user, params, await this.authTime(req), this.context(req)) });
  }

  async token(req: HttpRequest) {
    try {
      const client = await authenticateClient(req.header('authorization'), req.body);

      switch (str(req.body.grant_type)) {
        case 'authorization_code':
          return Reply.json(await exchangeCode(client, req.body)).headers(NO_STORE);
        case 'refresh_token':
          return Reply.json(await refreshTokens(client, req.body)).headers(NO_STORE);
        default:
          throw new OidcError('unsupported_grant_type', 'Use authorization_code or refresh_token.');
      }
    } catch (error) {
      return this.tokenFailure(error);
    }
  }

  async userinfo(req: HttpRequest) {
    const claims = await userinfo(req.bearerToken() ?? str(req.body.access_token));
    if (!claims) {
      return Reply.json({ error: 'invalid_token' }, 401).header('WWW-Authenticate', 'Bearer realm="oidc", error="invalid_token"');
    }
    return Reply.json(claims).headers(NO_STORE);
  }

  async revoke(req: HttpRequest) {
    try {
      const client = await authenticateClient(req.header('authorization'), req.body);
      const token = str(req.body.token);
      if (token) await OAuthRefreshToken.destroyByToken(token, client.id);
      return Reply.text('').headers(NO_STORE);
    } catch (error) {
      return this.tokenFailure(error);
    }
  }

  async logout(req: HttpRequest) {
    try {
      const target = await resolveLogout(req.query());
      await Auth.logout();
      return Reply.redirect(target ?? `${config('app.frontendUrl')}/login`);
    } catch (error) {
      return this.browserFailure(error);
    }
  }

  private context(req: HttpRequest) {
    return { ip: req.ip(), userAgent: req.userAgent() };
  }

  private async authTime(req: HttpRequest): Promise<Date> {
    const tokenId: number | null = req.auth?.currentTokenId() ?? null;
    const session = tokenId === null ? null : await AccessToken.find(tokenId);
    return session?.createdAt ?? new Date();
  }

  private async resolveRequest(token: unknown) {
    try {
      return await parseAuthorizeRequest(readRequest(String(token ?? '')));
    } catch (error) {
      if (error instanceof OidcError) this.abort(400, error.description);
      throw error;
    }
  }

  private browserFailure(error: unknown) {
    if (error instanceof RedirectableError) {
      return Reply.redirect(errorRedirect(error.redirectUri, error.state, error.code, error.description));
    }
    if (error instanceof OidcError) {
      const query = new URLSearchParams({ error: error.code, error_description: error.description });
      return Reply.redirect(`${config('app.frontendUrl')}/oauth/error?${query.toString()}`);
    }
    throw error;
  }

  private tokenFailure(error: unknown) {
    if (!(error instanceof OidcError)) throw error;

    const reply = Reply.json({ error: error.code, error_description: error.description }, error.status).headers(NO_STORE);
    return error.status === 401 ? reply.header('WWW-Authenticate', 'Basic realm="oidc"') : reply;
  }
}

export const oidcController = new OidcController();
