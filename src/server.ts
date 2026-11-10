import { createHash } from 'node:crypto';
import { app } from './bootstrap/app.js';
import { config } from './lib/core/config/index.js';

// Temporary diagnostics; remove once the configured secrets match.
const internalSecret = config('services.internal.sharedSecret');
console.log(
  `[boot] INTERNAL_SHARED_SECRET fingerprint: ${
    internalSecret
      ? `${createHash('sha256').update(internalSecret).digest('hex').slice(0, 8)} (len ${internalSecret.length})`
      : 'MISSING'
  }`,
);

void app.run();
