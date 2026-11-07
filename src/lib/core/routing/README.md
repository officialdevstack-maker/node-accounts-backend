# Routing pack (Laravel-style routes on Express)

```ts
import '../middleware/kernel.js';
import { Route } from '../lib/core/routing/index.js';

Route.get('/health', (req, res) => res.json({ ok: true })).name('health');

Route.group({ prefix: '/auth', as: 'auth.' }, () => {
  Route.post('/login', [authenticationController, 'create']).middleware('throttle:auth').name('login');
  Route.middleware('auth').group(() => {
    Route.get('/profile', [authenticationController, 'show']).name('profile');
  });
});

Route.group({ prefix: '/users', middleware: ['auth'], as: 'users.' }, () => {
  Route.resource('/', usersController);          // index, store, show, update, destroy
});

export const apiV1Route = Route.router();        // app.use('/api', apiV1Route)
```

```bash
npm run artisan -- route:list [--method=POST] [--name=auth] [--path=login] [--prefix=/api] [--file=src/routes/index.ts] [--middleware=auth] [--json]
npm run artisan -- make:controller Wallet --resource
```

`Route.url('auth.login')` returns `/auth/login`. `Route.url('users.index', { page: 2 })` appends leftover params as a query string. Declare routes first, call `Route.router()` last.

Middleware aliases are registered with `Middleware.alias('auth', () => authMiddleware)` and `Middleware.alias('throttle', ...)`; string aliases are resolved before route handlers run.
