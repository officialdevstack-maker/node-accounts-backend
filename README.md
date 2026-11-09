# Spurs Accounts backend

The API listens on `PORT` (default `3000`) and binds to `0.0.0.0`, as required by Render. Local development uses `npm run dev`; production builds with `npm ci && npm run build` and starts with `node dist/server.js`.

## Render deployment

Deploy using [`render.yaml`](./render.yaml). Set `APP_URL` to the public API origin and `OIDC_ISSUER` to that origin followed by `/api/oidc`. For the recommended Vercel same-origin setup, the browser-facing origin is the Vercel (or custom-domain) URL; Vercel rewrites `/api/*` to this Render service. See the [OIDC deployment guide](../sdk/js/oidc.md#13-deploying-on-render--vercel) for issuer and cookie configuration.

Render's filesystem is ephemeral, so use an external MySQL or PostgreSQL database for persistent storage; SQLite is intended for local use. Set `DB_CONNECTION` to `mysql`, `pgsql`, or `sqlite`. MySQL and PostgreSQL use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, and `DB_PASSWORD`; enable `DB_SSL` for providers that require TLS and set `DB_SSL_CA` when a CA certificate is needed. SQLite uses `DB_SQLITE_PATH`.

Production also requires `APP_KEY` or `JWT_SECRET`, `OIDC_PRIVATE_KEY`, `FRONTEND_URL`, and a non-empty `CORS_ORIGINS` list without `*`. Configure S3-compatible avatar storage with `AVATAR_STORAGE_DRIVER=s3` and the `S3_*` values. Set `REDIS_URL` to enable durable mail jobs and shared rate-limit storage.

Protect `/api/internal/*` with both the `internal` middleware and the appropriate `service:<scope>` middleware. Configure `INTERNAL_ALLOWED_IPS` and/or `INTERNAL_SHARED_SECRET`, and restrict the route at the proxy or network boundary as well.

## Checks

```sh
npm ci
npx tsc --noEmit
npm run lint
npm test
npm run build
node dist/lib/core/artisan.js list
```
