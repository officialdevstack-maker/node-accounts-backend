export function providerStub(cls) {
    return `// src/providers/${cls}.ts
import { ServiceProvider } from '../lib/core/boot/index.js';

export class ${cls} extends ServiceProvider {
  // Implement only the hooks you need. Each one runs for every provider before the next one starts.

  register(): void {
    // 1. set things up (init models, read config)
  }

  // middleware(): void {
  //   // 2. this.app.express.use(...)
  // }

  // routes(): void {
  //   // 3. this.app.express.use('/path', router)
  // }

  // errors(): void {
  //   // 4. error handlers
  // }

  // async boot(): Promise<void> {
  //   // 5. connect to things, runs just before the server listens
  // }

  // async shutdown(): Promise<void> {
  //   // close connections on SIGINT / SIGTERM
  // }
}
`;
}
//# sourceMappingURL=stubs.js.map