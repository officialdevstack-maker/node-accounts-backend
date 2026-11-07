import { ServiceProvider } from '../lib/core/boot/index.js';
import { errorHandler, notFound } from '../middleware/error.js';

export class ErrorServiceProvider extends ServiceProvider {
  errors(): void {
    this.app.express.use(notFound);
    this.app.express.use(errorHandler);
  }
}
