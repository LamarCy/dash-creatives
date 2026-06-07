import { Router } from 'express';
import { listUpcomingEvents } from '../services/eventsService.js';

export const eventsRouter = Router();

eventsRouter.get('/', async (_req, res, next) => {
  try {
    const events = await listUpcomingEvents();
    res.json({ ok: true, events });
  } catch (err) {
    next(err);
  }
});
