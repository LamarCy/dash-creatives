import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { contactRouter } from './routes/contact.js';
import { eventsRouter } from './routes/events.js';
import { productsRouter } from './routes/products.js';
import { commissionsRouter } from './routes/commissions.js';
import { env } from './config/env.js';

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(corsMiddleware);
  app.use(express.json({ limit: '64kb' }));
  app.use(pinoHttp({ level: env.LOG_LEVEL }));

  app.use('/api/health', healthRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/events', eventsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/commissions', commissionsRouter);

  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: 'not_found' });
  });

  app.use(errorHandler);
  return app;
}
