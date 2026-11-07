import { Application, HttpServiceProvider } from '../lib/core/boot/index.js';

export const app = Application.create(HttpServiceProvider);
