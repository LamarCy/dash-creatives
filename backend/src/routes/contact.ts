import { Router } from 'express';
import { contactSchema } from '../schemas/contact.schema.js';
import { handleContact } from '../services/contactService.js';
import { contactLimiter } from '../middleware/rateLimit.js';

export const contactRouter = Router();

contactRouter.post('/', contactLimiter, async (req, res, next) => {
  try {
    // Honeypot: any extra field named 'website' should be empty
    if (typeof req.body?.website === 'string' && req.body.website.trim() !== '') {
      // Silently succeed — don't tell the bot it was caught
      res.json({ ok: true });
      return;
    }
    const payload = contactSchema.parse(req.body);
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? req.ip;
    const userAgent = req.headers['user-agent']?.toString();
    const result = await handleContact(payload, { ip, userAgent });
    res.json({ ok: true, id: result.id });
  } catch (err) {
    next(err);
  }
});
