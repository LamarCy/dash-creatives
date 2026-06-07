import { Router } from 'express';
import { listProducts } from '../services/productsService.js';

export const productsRouter = Router();

productsRouter.get('/', async (req, res, next) => {
  try {
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const products = await listProducts(type);
    res.json({ ok: true, products });
  } catch (err) {
    next(err);
  }
});
