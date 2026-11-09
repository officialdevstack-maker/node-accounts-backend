import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '../../config/index.js';
import { DB } from '../../query/index.js';
import { ServiceProvider } from '../ServiceProvider.js';

export class HttpServiceProvider extends ServiceProvider {
  middleware(): void {
    const http = this.app.express;
    const production = config('app.env') === 'production';

    http.set('trust proxy', config('app.trustProxy'));
    http.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
    http.use(cors({ origin: production ? config('app.corsOrigins') : true, credentials: true }));
    http.use(morgan(production ? 'combined' : 'dev'));
    http.use(express.json());
    http.use(express.urlencoded({ extended: true }));
    http.use(cookieParser());
  }

  routes(): void {
    this.app.express.get('/health', async (_req, res, next) => {
      try {
        await DB.select('select 1 as ok');
        res.status(200).json({ status: 'ok' });
      } catch (error) {
        next(error);
      }
    });
  }
}
