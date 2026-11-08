// database/paths.ts
// Resolved from this file, so the pack works wherever you place it (project root or src/).
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const databaseRoot = dirname(fileURLToPath(import.meta.url));
export const databasePath = (...parts) => join(databaseRoot, ...parts);
//# sourceMappingURL=paths.js.map