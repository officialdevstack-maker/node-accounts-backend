// config/services.ts  (Laravel: config/services.php)
// Third-party credentials. Values stay empty until you set them, nothing throws at boot.
// Call env.required(...) here instead if a service must always be configured.
import { env } from './env.js';

export const servicesConfig = {
  termii: {
    apiKey: env.string('TERMII_API_KEY'),
    baseUrl: env.string('TERMII_BASE_URL', 'https://api.ng.termii.com'),
    channel: env.oneOf('TERMII_CHANNEL', ['generic', 'dnd', 'whatsapp'] as const, 'generic'),
  },

  paystack: {
    publicKey: env.string('PAYSTACK_PUBLIC_KEY'),
    secretKey: env.string('PAYSTACK_SECRET_KEY'),
    webhookSecret: env.string('PAYSTACK_WEBHOOK_SECRET'),
    baseUrl: env.string('PAYSTACK_BASE_URL', 'https://api.paystack.co'),
  },

  flutterwave: {
    publicKey: env.string('FLW_PUBLIC_KEY'),
    secretKey: env.string('FLW_SECRET_KEY'),
    webhookHash: env.string('FLW_WEBHOOK_HASH'),
    baseUrl: env.string('FLW_BASE_URL', 'https://api.flutterwave.com/v3'),
  },
};
