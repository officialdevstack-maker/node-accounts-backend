import { ServiceProvider } from '../lib/core/boot/index.js';
import { errorHandler, notFound } from '../middleware/error.js';
export class ErrorServiceProvider extends ServiceProvider {
    errors() {
        this.app.express.use(notFound);
        this.app.express.use(errorHandler);
    }
}
//# sourceMappingURL=ErrorServiceProvider.js.map