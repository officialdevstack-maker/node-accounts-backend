# Rate limiter pack

Needs the `config/` pack (and `middleware/` + `routing/` to use `'throttle:...'` strings).

```ts
import { Limit, RateLimiter } from '../lib/core/ratelimit/index.js';

RateLimiter.for('api', (req) => Limit.perMinute(120).by(req.ip));
RateLimiter.for('auth', (req) => [Limit.perMinute(20).by(req.ip), Limit.perMinute(5).by(req.body?.email)]);
```

```ts
// Route.post('/login', [controller, 'create']).middleware('throttle:auth');
// Route.post('/verify-email', [...]).middleware('throttle:5,1');
```

Manual use (login lockout, OTP attempts):
```ts
if (await RateLimiter.tooManyAttempts(key, 5)) { /* locked, RateLimiter.availableIn(key) seconds left */ }
await RateLimiter.hit(key, 900);
await RateLimiter.clear(key);
```

| `Limit` | |
|---|---|
| `perSecond(n)` `perMinute(n, minutes)` `perHour(n, hours)` `perDay(n, days)` | window |
| `none()` | unlimited |
| `.by(value)` | count per value instead of per IP |
|