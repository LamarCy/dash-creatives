import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ ok: false, error: 'invalid_input', issues: err.flatten() });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal error';
  if (typeof message === 'string' && message.startsWith('CORS:')) {
    res.status(403).json({ ok: false, error: 'cors_not_allowed' });
    return;
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'internal_error' });
};
