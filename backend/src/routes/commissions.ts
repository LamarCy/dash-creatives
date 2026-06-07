import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { supabaseEnabled } from '../config/env.js';
import { contactLimiter } from '../middleware/rateLimit.js';

export const commissionsRouter = Router();

const inquirySchema = z.object({
  tier_slug: z.string().max(80).optional(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  budget: z.string().max(120).optional(),
  brief: z.string().min(1).max(8000),
});

commissionsRouter.get('/tiers', async (_req, res, next) => {
  try {
    if (!supabaseEnabled) {
      res.json({ ok: true, tiers: [] });
      return;
    }
    const { data, error } = await supabaseAdmin()
      .from('commission_tiers')
      .select('*')
      .order('sort_order');
    if (error) throw new Error(error.message);
    res.json({ ok: true, tiers: data });
  } catch (err) {
    next(err);
  }
});

commissionsRouter.post('/inquiry', contactLimiter, async (req, res, next) => {
  try {
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      res.json({ ok: true });
      return;
    }
    const payload = inquirySchema.parse(req.body);
    if (!supabaseEnabled) {
      console.log('[commissions] Supabase disabled — would have saved:', payload);
      res.json({ ok: true, id: null });
      return;
    }
    const { data, error } = await supabaseAdmin()
      .from('commissions')
      .insert({
        tier_slug: payload.tier_slug ?? null,
        name: payload.name,
        email: payload.email,
        budget: payload.budget ?? null,
        brief: payload.brief,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    res.json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    next(err);
  }
});
