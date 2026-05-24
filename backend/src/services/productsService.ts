import { supabaseAdmin } from '../config/supabase.js';
import { supabaseEnabled } from '../config/env.js';

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  price_cents: number | null;
  currency: string;
  status: string;
  image_path: string | null;
  alt: string | null;
  badge: string | null;
  sort_order: number;
};

export async function listProducts(type?: string): Promise<ProductRow[]> {
  if (!supabaseEnabled) return [];
  let q = supabaseAdmin().from('products').select('*').eq('status', 'listed').order('sort_order');
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw new Error(`supabase_query_failed: ${error.message}`);
  return data as ProductRow[];
}
