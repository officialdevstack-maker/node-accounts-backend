# Routing pack (Laravel-style routes on Express)

```ts
import { Route } from '../lib/core/routing/index.js';

Route.get('/health', (req, res) => res.json({ ok: true })).name('health');

Route.group({ prefix: '/auth', as: 'auth.' }, () => {
  Route.post('/login', [authenticationController, 'create']).name('login');
  Route.get('/profile', [authenticationController, 'show']).middleware(authMiddleware).name('profile');
});

Route.group({ prefix: '/users', middleware: [authMiddleware], as: 'users.' }, () => {
  Route.resource('/', usersController);          // index, store, show, update, destroy
});

export const apiV1Route = Route.router();        // app.use('/api', apiV1Route)
```

```
npm run artisan -- route:list [--method=POST] [--name=auth] [--path=login] [--prefix=/api] [--file=src/routes/index.ts]
npm run artisan -- make:controller Wallet --resource
```

`Route.url('auth.login')` returns `/auth/login`. Declare routes first, call `Route.router()` last.
