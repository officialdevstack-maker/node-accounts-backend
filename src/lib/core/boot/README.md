# Boot pack (application kernel)

A provider is a class with optional hooks. The `Application` runs each hook for every provider before moving to the next one:

| Order | Hook | Use it for |
|---|---|---|
| 1 | `register()` | init models, read config |
| 2 | `middleware()` | cors, parsers, auth: `this.app.express.use(...)` |
| 3 | `routes()` | mount routers |
| 4 | `errors()` | 404 + error handler (always after every route) |
| 5 | `boot()` | connect to the database, just before listening |
| - | `shutdown()` | on Ctrl+C / SIGTERM, reverse order |

```ts
// src/bootstrap/app.ts
export const app = Application.create(HttpServiceProvider, AuthServiceProvider, DatabaseServiceProvider, RouteServiceProvider, ErrorServiceProvider);

// src/server.ts
void app.run();
```

```bash
npm run artisan -- serve [--port=4000]
npm run artisan -- make:provider Queue
```

Tests: `supertest(await app.bootstrap())` builds the Express app without listening.
Provider order = middleware order, so `HttpServiceProvider` goes first.
