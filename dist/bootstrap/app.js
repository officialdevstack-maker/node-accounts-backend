import { Application, HttpServiceProvider } from '../lib/core/boot/index.js';
import { AuthServiceProvider } from '../providers/AuthServiceProvider.js';
import { DatabaseServiceProvider } from '../providers/DatabaseServiceProvider.js';
import { ErrorServiceProvider } from '../providers/ErrorServiceProvider.js';
import { RouteServiceProvider } from '../providers/RouteServiceProvider.js';
export const app = Application.create(HttpServiceProvider, AuthServiceProvider, DatabaseServiceProvider, RouteServiceProvider, ErrorServiceProvider);
//# sourceMappingURL=app.js.map