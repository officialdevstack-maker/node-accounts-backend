import Auth from '../lib/auth/index.js';
import { ServiceProvider } from '../lib/core/boot/index.js';
export class AuthServiceProvider extends ServiceProvider {
    middleware() {
        this.app.express.use((req, res, next) => Auth.initialize(req, res, next));
    }
}
//# sourceMappingURL=AuthServiceProvider.js.map