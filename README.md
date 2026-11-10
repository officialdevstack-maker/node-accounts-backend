# Spurs Accounts backend

The API listens on `PORT` (default `3000`) and binds to `0.0.0.0`, as required by Render. Local development uses `npm run dev`; production builds with `npm ci && npm run build` and starts with `node dist/server.js`.

## Render deployment

Deploy using [`render.yaml`](./render.yaml). Set `APP_URL` to the public API origin and `OIDC_ISSUER` to that origin followed by `/api/oidc`. For the recommended Vercel same-origin setup, the browser-facing origin is the Vercel (or custom-domain) URL; Vercel rewrites `/api/*` to this Render service. See the [OIDC deployment guide](../sdk/js/oidc.md#13-deploying-on-render--vercel) for issuer and cookie configuration.

Render's filesystem is ephemeral, so use an external MySQL or PostgreSQL database for persistent storage; SQLite is intended for local use. Set `DB_CONNECTION` to `mysql`, `pgsql`, or `sqlite`. MySQL and PostgreSQL use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`; enable `DB_SSL` for providers that require TLS and set `DB_SSL_CA` when a CA certificate is needed. SQLite uses `DB_SQLITE_PATH`.

Production also requires `APP_KEY` or `JWT_SECRET`, `OIDC_PRIVATE_KEY`, `FRONTEND_URL`, and a non-empty `CORS_ORIGINS` list without `*`. Configure S3-compatible avatar storage with `AVATAR_STORAGE_DRIVER=s3` and the `S3_*` values. Set `REDIS_URL` to enable durable mail jobs and shared rate-limit storage.

Admin-site routes under `/api/internal/admin/*` and `/api/internal/stats/*` require the `x-internal-secret` header; they do not use a user session or service token. Call them only from the admin site's server over HTTPS, and never expose the shared key to a browser. Configure a long, random `INTERNAL_SHARED_SECRET` and restrict access at the proxy or network boundary as well. The separate `/api/internal/users/{id}` endpoint continues to use the internal-network and `users:read` service-token checks.

The admin settings page reads and updates the whitelisted settings through
`/api/internal/admin/settings`. Apply the pending backend migration before using it:

```sh
npm run artisan -- migrate
```

Disabling `registration_enabled` rejects new registrations. `maintenance_mode` is stored
as an operational flag and does not by itself block requests.

## Checks

```sh
npm ci
npx tsc --noEmit
npm run lint
npm test
npm run build
node dist/lib/core/artisan.js list
```
