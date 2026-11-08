// artisan.ts
// Run:  npx tsx artisan.ts <command>      (or add  "artisan": "tsx artisan.ts"  to package.json scripts)
import { artisan } from './cli/index.js';
await artisan(process.argv.slice(2));
//# sourceMappingURL=artisan.js.map