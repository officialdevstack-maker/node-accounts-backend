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

Route.prefix('/admin').prefix('/v1').name('admin.').where('id', /^\d+$/).middleware('auth').controller(adminController).group(() => {
  Route.get('/stats/{id}', 'index').name('stats');
});

export const apiV1Route = Route.router();        // app.use('/api', apiV1Route)
```

Object-form and fluent groups share the same options. Fluent prefixes and names accumulate; `Route.withoutMiddleware(...)` and `Route.name(...)` can start a group directly. Group `where` constraints are inherited and can be overridden on an individual route.

```bash
npm run artisan -- route:list [--method=POST] [--name=auth] [--path=login] [--prefix=/api] [--file=src/routes/api.ts] [--middleware=auth] [--json]
npm run artisan -- make:controller Wallet --resource
```

`Route.controller(ctrl).group(() => { Route.get('/profile', 'show'); });` resolves string actions against the current controller.
`Route.resource('users.posts', usersController)` creates nested resource routes such as `/users/{user}/posts/{id}` and `Route.url('users.posts.show', { user: 7, id: 5 })` -> `/users/7/posts/5`.
`Route.pattern('id', /^\d+$/)` and `.whereNumber('id')` guard params before middleware runs, and `Route.fallback()` registers a catch-all 404 route.
`Route.url('auth.login')` returns `/auth/login`. `Route.url('users.index', { page: 2 })` appends leftover params as a query string. Declare routes first, call `Route.router()` last.

Middleware aliases are registered with `Middleware.alias('auth', () => authMiddleware)` and `Middleware.alias('throttle', ...)`; string aliases are resolved before route handlers run.
