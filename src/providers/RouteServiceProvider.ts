import { ServiceProvider } from '../lib/core/boot/index.js';

export class RouteServiceProvider extends ServiceProvider {
  async routes(): Promise<void> {
    const { apiV1Route } = await import('../routes/api.js');
    this.app.express.use('/api', apiV1Route);
  }
}
