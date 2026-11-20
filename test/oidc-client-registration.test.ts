import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { OidcClientRegistrationError, validateOidcClientSettings } from '../src/lib/oidc/register-client.js'

const settings = {
  redirectUris: ['https://client.example.test/callback'],
  postLogoutRedirectUris: [],
  backchannelLogoutUri: null,
  scopes: ['openid', 'profile'],
  clientCredentialsEnabled: false,
}

describe('OIDC client registration settings', () => {
  it('accepts a valid authorization-code client', () => {
    assert.doesNotThrow(() => validateOidcClientSettings(settings))
  })

  it('allows loopback HTTP but rejects non-loopback HTTP redirects', () => {
    assert.doesNotThrow(() => validateOidcClientSettings({
      ...settings,
      redirectUris: ['http://localhost:3000/callback'],
    }))
    assert.throws(
      () => validateOidcClientSettings({ ...settings, redirectUris: ['http://client.example.test/callback'] }),
      OidcClientRegistrationError,
    )
  })

  it('rejects authorization-code scopes without openid and client-credentials OIDC scopes', () => {
    assert.throws(
      () => validateOidcClientSettings({ ...settings, scopes: ['profile'] }),
      OidcClientRegistrationError,
    )
    assert.throws(
      () => validateOidcClientSettings({ ...settings, clientCredentialsEnabled: true }),
      OidcClientRegistrationError,
    )
  })
})
