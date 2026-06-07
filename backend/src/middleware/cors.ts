import cors from 'cors';
import { corsOrigins } from '../config/env.js';

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // same-origin / curl
    if (corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin not allowed: ${origin}`));
  },
  credentials: false,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
});
