import { Router } from 'express';
import { supabaseEnabled, emailEnabled } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'dash-creatives-api',
    uptime: process.uptime(),
    supabase: supabaseEnabled,
    email: emailEnabled,
    time: new Date().toISOString(),
  });
});
