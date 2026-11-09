/** A protocol error we cannot send back to the app (unknown client, bad redirect_uri) or a token-endpoint error. */
export class OidcError extends Error {
  constructor(
    readonly code: string,
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
    this.name = 'OidcError';
  }
}

/** Safe to deliver to the app's redirect_uri as ?error=... */
export class RedirectableError extends OidcError {
  constructor(
    code: string,
    description: string,
    readonly redirectUri: string,
    readonly state: string | undefined,
  ) {
    super(code, description);
    this.name = 'RedirectableError';
  }
}
