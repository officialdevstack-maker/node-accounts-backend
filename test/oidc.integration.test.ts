import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { after, before, describe, it } from 'node:test'
import type { Express } from 'express'
import request from 'supertest'

process.env.NODE_ENV = 'test'
await import('dotenv/config')
process.env.APP_URL = 'http://localhost:3000'
process.env.FRONTEND_URL = 'http://localhost:5173'
process.env.OIDC_ISSUER = 'http://localhost:3000/api/oidc'
process.env.DB_CONNECTION = process.env.TEST_DB_CONNECTION || 'mysql'
process.env.DB_NAME = process.env.TEST_DB_NAME || 'node_accounts_test'
process.env.DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1'
process.env.DB_PORT = process.env.TEST_DB_PORT || '3306'
process.env.DB_USERNAME = process.env.TEST_DB_USERNAME || 'root'
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'root'
process.env.DB_SSL = process.env.TEST_DB_SSL || 'false'
process.env.JWT_SECRET = 'test-only-jwt-secret'
process.env.OIDC_PRIVATE_KEY = ''
process.env.OIDC_KEY_PATH = 'storage/test-oidc/private.pem'
process.env.AUTH_COOKIE_DOMAIN = ''
process.env.BCRYPT_ROUNDS = '4'
process.env.RATE_LIMIT_STORE = 'memory'
process.env.RATE_LIMIT_ENABLED = 'false'
process.env.QUEUE_DRIVER = 'memory'
process.env.AVATAR_STORAGE_DRIVER = 'local'

const { app } = await import('../src/bootstrap/app.js')
const { Database } = await import('../src/lib/core/database/Database.js')
const { Migrator } = await import('../src/lib/core/database/Migrator.js')
const { DB } = await import('../src/lib/core/query/index.js')
const { OAuthClient } = await import('../src/models/OAuthClient.js')
const { User } = await import('../src/models/User.js')
const { pkceChallenge, sha256 } = await import('../src/lib/oidc/util.js')

const redirectUri = 'https://client.example.test/callback'
const email = `oidc-${randomUUID()}@example.test`
const clientIds: string[] = []
let api: Express
let userId = 0
let sessionCookie = ''

type TestClient = {
  clientId: string
  clientSecret: string | null
  databaseId: number
  name: string
}

async function createClient(input: {
  name?: string
  type?: 'first_party' | 'third_party'
  scopes?: string[]
  confidential?: boolean
  clientCredentialsEnabled?: boolean
} = {}): Promise<TestClient> {
  const clientId = `test_${randomUUID().replaceAll('-', '')}`
  const clientSecret = input.confidential ? randomUUID() : null
  const name = input.name ?? `Test client ${clientIds.length + 1}`
  const client = await OAuthClient.create({
    clientId,
    secretHash: clientSecret ? sha256(clientSecret) : null,
    name,
    type: input.type ?? 'first_party',
    redirectUris: [redirectUri],
    postLogoutRedirectUris: [],
    allowedScopes: input.scopes ?? ['openid', 'profile', 'offline_access'],
    clientCredentialsEnabled: input.clientCredentialsEnabled ?? false,
    isActive: true,
  })
  clientIds.push(clientId)
  return { clientId, clientSecret, databaseId: client.id, name }
}

async function authorize(client: TestClient, prompt?: string, maxAge?: number) {
  const verifier = randomBytes(32).toString('base64url')
  const query: Record<string, string | number> = {
    client_id: client.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile offline_access',
    state: randomUUID(),
    nonce: randomUUID(),
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256',
  }
  if (prompt) query.prompt = prompt
  if (maxAge !== undefined) query.max_age = maxAge

  const response = await request(api)
    .get('/api/oidc/authorize')
    .set('Cookie', sessionCookie)
    .query(query)
  return { response, verifier }
}

async function exchangeCode(client: TestClient, code: string, verifier: string) {
  return request(api)
    .post('/api/oidc/token')
    .type('form')
    .send({
      grant_type: 'authorization_code',
      client_id: client.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    })
}

async function authorizeAndExchange(client: TestClient) {
  const { response, verifier } = await authorize(client)
  assert.equal(response.status, 302)
  assert.equal(typeof response.headers.location, 'string')
  const redirect = new URL(response.headers.location)
  const code = redirect.searchParams.get('code')
  assert.ok(code)
  const tokens = await exchangeCode(client, code, verifier)
  assert.equal(tokens.status, 200)
  return { code, verifier, tokens: tokens.body as Record<string, unknown> }
}

async function grantFor(client: TestClient) {
  const row = await DB.table('oauth_grants')
    .where('user_id', userId)
    .where('oauth_client_id', client.databaseId)
    .first()
  assert.ok(row)
  return Number(row.id)
}

describe('OIDC integration', { concurrency: false }, () => {
  before(async () => {
    api = await app.bootstrap()
    await new Migrator(Database.connection()).run()

    const user = await User.create({
      fullname: 'OIDC Integration User',
      email,
      password: 'InitialPassword1!',
      phone: null,
      accountType: 'user',
    })
    userId = user.id

    const login = await request(api).post('/api/auth/login').send({
      email,
      password: 'InitialPassword1!',
    })
    assert.equal(login.status, 200)
    const cookies = login.headers['set-cookie']
    assert.ok(Array.isArray(cookies) && cookies.length > 0)
    sessionCookie = cookies[0]!.split(';', 1)[0]!
  })

  after(async () => {
    try {
      if (userId) await DB.table('users').where('id', userId).delete()
      for (const clientId of clientIds) {
        await DB.table('oauth_clients').where('client_id', clientId).delete()
      }
    } finally {
      await app.stop()
    }
  })

  it('exchanges an authorization code with PKCE', async () => {
    const client = await createClient()
    const { tokens } = await authorizeAndExchange(client)
    assert.equal(typeof tokens['access_token'], 'string')
    assert.equal(typeof tokens['id_token'], 'string')
    assert.equal(typeof tokens['refresh_token'], 'string')
  })

  it('revokes refresh tokens when an authorization code is replayed', async () => {
    const client = await createClient()
    const { code, verifier } = await authorizeAndExchange(client)
    const replay = await exchangeCode(client, code, verifier)
    assert.equal(replay.status, 400)
    assert.equal(replay.body.error, 'invalid_grant')

    const grantId = await grantFor(client)
    const refreshTokens = await DB.table('oauth_refresh_tokens').where('grant_id', grantId).get()
    assert.equal(refreshTokens.length, 0)
  })

  it('rotates refresh tokens and revokes the grant when an old token is reused', async () => {
    const client = await createClient()
    const { tokens } = await authorizeAndExchange(client)
    const original = String(tokens['refresh_token'])
    const rotated = await request(api)
      .post('/api/oidc/token')
      .type('form')
      .send({ grant_type: 'refresh_token', client_id: client.clientId, refresh_token: original })

    assert.equal(rotated.status, 200)
    assert.notEqual(rotated.body.refresh_token, original)

    await DB.table('oauth_refresh_tokens')
      .where('token_hash', sha256(original))
      .update({ used_at: new Date(Date.now() - 11_000) })
    const reuse = await request(api)
      .post('/api/oidc/token')
      .type('form')
      .send({ grant_type: 'refresh_token', client_id: client.clientId, refresh_token: original })

    assert.equal(reuse.status, 400)
    assert.equal(reuse.body.error, 'invalid_grant')
    const grantId = await grantFor(client)
    assert.equal((await DB.table('oauth_refresh_tokens').where('grant_id', grantId).get()).length, 0)
  })

  it('removes prompt=login and max_age from the login return URL', async () => {
    const client = await createClient()
    const { response } = await authorize(client, 'login consent', 0)
    assert.equal(response.status, 302)
    assert.equal(typeof response.headers.location, 'string')

    const loginUrl = new URL(response.headers.location)
    assert.equal(loginUrl.pathname, '/login')
    const returnTo = loginUrl.searchParams.get('return_to')
    assert.ok(returnTo)
    const authorizationUrl = new URL(returnTo, 'http://localhost:3000')
    assert.equal(authorizationUrl.searchParams.get('prompt'), 'consent')
    assert.equal(authorizationUrl.searchParams.has('max_age'), false)
  })

  it('returns access_denied when the user declines third-party consent', async () => {
    const client = await createClient({ type: 'third_party' })
    const { response } = await authorize(client)
    assert.equal(response.status, 302)
    assert.equal(typeof response.headers.location, 'string')
    const consentUrl = new URL(response.headers.location)
    assert.equal(consentUrl.pathname, '/consent')

    const denied = await request(api)
      .post('/api/oidc/consent')
      .set('Cookie', sessionCookie)
      .send({ request: consentUrl.searchParams.get('request'), approve: false })
    assert.equal(denied.status, 200)
    assert.equal(new URL(denied.body.data.redirect).searchParams.get('error'), 'access_denied')
  })

  it('issues a client-credentials token for an enabled confidential client', async () => {
    const client = await createClient({
      scopes: ['users:read'],
      confidential: true,
      clientCredentialsEnabled: true,
    })
    const response = await request(api)
      .post('/api/oidc/token')
      .set('Authorization', `Basic ${Buffer.from(`${client.clientId}:${client.clientSecret}`).toString('base64')}`)
      .type('form')
      .send({ grant_type: 'client_credentials', scope: 'users:read' })

    assert.equal(response.status, 200)
    assert.equal(typeof response.body.access_token, 'string')
    assert.equal(response.body.scope, 'users:read')
    assert.equal(response.body.refresh_token, undefined)
  })

  it('introspects an active user access token for a confidential first-party client', async () => {
    const target = await createClient()
    const introspectionClient = await createClient({ confidential: true })
    const { tokens } = await authorizeAndExchange(target)
    const response = await request(api)
      .post('/api/oidc/introspect')
      .set('Authorization', `Basic ${Buffer.from(`${introspectionClient.clientId}:${introspectionClient.clientSecret}`).toString('base64')}`)
      .type('form')
      .send({ token: tokens['access_token'] })

    assert.equal(response.status, 200)
    assert.equal(response.body.active, true)
    assert.equal(response.body.client_id, target.clientId)
    assert.equal(response.body.sub, String(userId))
  })

  it('returns only active client name and logo URI from client-info', async () => {
    const client = await createClient({ name: 'Visible Test Client' })
    const response = await request(api).get('/api/oidc/client-info').query({ client_id: client.clientId })

    assert.equal(response.status, 200)
    assert.deepEqual(response.body, { name: client.name, logoUri: null })
  })

  it('revokes refresh tokens and authorization codes after a password change', async () => {
    const client = await createClient()
    await authorizeAndExchange(client)
    await authorize(client)

    const changed = await request(api)
      .post('/api/auth/change-password')
      .set('Cookie', sessionCookie)
      .send({
        current_password: 'InitialPassword1!',
        password: 'ChangedPassword2!',
        password_confirmation: 'ChangedPassword2!',
      })

    assert.equal(changed.status, 200)
    const grants = await DB.table('oauth_grants').where('user_id', userId).get()
    for (const grant of grants) {
      const grantId = Number(grant.id)
      assert.equal((await DB.table('oauth_refresh_tokens').where('grant_id', grantId).get()).length, 0)
      assert.equal((await DB.table('oauth_codes').where('grant_id', grantId).get()).length, 0)
    }
  })
})
