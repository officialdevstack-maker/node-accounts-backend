# Request pack (HttpRequest + FormRequest)

Every route handler receives an `HttpRequest` wrapper. The Express request is still available as `req.raw`.

```ts
req.input('email')
req.all()
req.only('a', 'b')
req.except('password')
req.query('page', 1)
req.post('email')
req.route('id')
req.has('a')
req.filled('a')
req.missing('a')
req.string('a')
req.integer('page', 1)
req.boolean('remember')
req.header('x-key')
req.bearerToken()
req.ip()
req.path()
req.fullUrl()
req.user
req.body
req.params
req.headers
req.cookies

await req.validate({
  email: 'required|email',
});
```

Use a form request on a route to validate and authorize before the controller method runs:

```ts
Route.post('/register', [controller, 'store']).request(RegisterUserRequest);
```
