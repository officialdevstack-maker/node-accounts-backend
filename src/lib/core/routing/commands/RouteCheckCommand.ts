import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import express from 'express';
import { Command } from '../../cli/index.js';
import HttpError from '../../../error.js';
import { singularize } from '../../database/support.js';
import { errorHandler, notFound } from '../../../../middleware/error.js';
import { Route, RouteRegistry } from '../index.js';
import { UrlSigner } from '../UrlSigner.js';

export class RouteCheckCommand extends Command {
  readonly signature = 'route:check';
  readonly description = 'Run focused checks for the routing pack';

  async handle(): Promise<number> {
    try {
      assert.equal(singularize('categories'), 'category');
      assert.equal(singularize('addresses'), 'address');
      assert.equal(singularize('status'), 'status');

      Route.clear();
      Route.set('resources', () => {
        Route.resource(
          'categories.products',
          { show: () => undefined },
          { only: ['show'], parameters: { categories: 'category' }, param: 'productId' },
        );
      });
      assert.equal(Route.all('resources')[0]?.uri, '/categories/{category}/products/{productId}');

      Route.clear();
      Route.set('shadow', () => {
        Route.get('/users/{id}', () => undefined);
        Route.get('/users/{name}', () => undefined);
      });
      assert.throws(() => RouteRegistry.assertValid('shadow'), /Shadowed routes declared/);
      Route.clear();

      let anyCalls = 0;
      Route.set('api', () => {
        Route.any('/any', (_req, res) => {
          anyCalls++;
          res.status(204).end();
        }).name('any');
        Route.get('/signed', (_req, res) => res.status(204).end()).middleware('signed').name('signed');
        Route.get('/head-explicit', (_req, res) => res.send('get'));
        Route.head('/head-explicit', (_req, res) => res.status(204).end());
        Route.get('/users/{id}', (_req, res) => res.send('parameter'));
        Route.get('/users/me', (_req, res) => res.send('literal'));
        Route.fallback();
      });
      Route.set('web', () => {
        Route.get('/home', () => undefined).name('home');
      });
      Route.mount('api', '/api');
      Route.mount('web', '/web');

      assert.equal(Route.all().length, 8);
      assert.equal(Route.url('home'), '/web/home');
      assert.equal(Route.url('any'), '/api/any');
      assert.deepEqual(Route.all('api')[0]?.methods, ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
      assert.equal(UrlSigner.verify(Route.signedUrl('signed', { filter: 'recent' })), true);
      const currentTime = Date.now;
      let mockTime = currentTime();
      let expiredSignedUrl = '';
      try {
        Date.now = () => mockTime;
        expiredSignedUrl = Route.signedUrl('signed', {}, { expiresIn: 1 });
        mockTime += 2_000;
        assert.equal(UrlSigner.verify(expiredSignedUrl), false);
      } finally {
        Date.now = currentTime;
      }

      const app = express();
      app.use('/api', Route.router('api'));
      app.use('/web', Route.router('web'));
      app.use(notFound);
      app.use(errorHandler);

      const server = createServer(app);
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });

      try {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Route check server did not bind a TCP address.');
        const origin = `http://127.0.0.1:${address.port}`;

        for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
          const response = await fetch(`${origin}/api/any`, { method });
          assert.equal(response.status, 204, `${method} should match Route.any`);
        }
        assert.equal(anyCalls, 7);

        const literal = await fetch(`${origin}/api/users/me`);
        assert.equal(await literal.text(), 'literal');

        assert.equal((await fetch(`${origin}/api/head-explicit`, { method: 'HEAD' })).status, 204);

        const signed = new URL(Route.signedUrl('signed', { filter: 'recent' }));
        signed.host = `127.0.0.1:${address.port}`;
        assert.equal((await fetch(signed)).status, 204);
        signed.searchParams.set('filter', 'tampered');
        assert.equal((await fetch(signed)).status, 403);

        const expired = new URL(expiredSignedUrl);
        expired.host = `127.0.0.1:${address.port}`;
        assert.equal((await fetch(expired)).status, 403);

        const missing = await fetch(`${origin}/api/missing`);
        assert.equal(missing.status, 404);
        assert.equal((await missing.json()).message, 'Route GET /api/missing not found.');
      } finally {
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }

      Route.clear();
      this.success('Routing checks passed.');
      return 0;
    } catch (error) {
      Route.clear();
      if (error instanceof HttpError) throw error;
      throw new Error(`Routing check failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }
}
