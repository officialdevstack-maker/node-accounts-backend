import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { config } from '../../config/index.js';
import { ServiceProvider } from '../ServiceProvider.js';

export class HttpServiceProvider extends ServiceProvider {
  middleware(): void {
    const http = this.app.express;
    const production = config('app.env') === 'production';

    http.use(cors({ origin: production ? config('app.corsOrigins') : true, credentials: true }));
    http.use(morgan(production ? 'combined' : 'dev'));
    http.use(express.json());
    http.use(express.urlencoded({ extended: true }));
    http.use(cookieParser());
  }
}
