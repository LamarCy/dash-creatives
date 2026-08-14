// The singles catalog — one place for titles, prices, and file keys.
// Blobs store "singles" holds: manifest.json + files/<sku> (the audio masters).
import Stripe from 'stripe';
import { getStore, type Store } from '@netlify/blobs';

export type Sku = 'lowcountry' | 'momma';

export interface Track {
  sku: Sku;
  title: string;
  catalogNo: string;
  priceCents: number;
  cover: string;
  downloadName: string;
}

export const CATALOG: Record<Sku, Track> = {
  lowcountry: {
    sku: 'lowcountry',
    title: 'Lowcountry Beach',
    catalogNo: 'LC-001',
    priceCents: 99,
    cover: 'https://dashcreatives.art/gateway/single-lowcountry.jpg',
    downloadName: 'LamarCy - Lowcountry Beach.mp3',
  },
  momma: {
    sku: 'momma',
    title: 'Momma Gone',
    catalogNo: 'LC-002',
    priceCents: 99,
    cover: 'https://dashcreatives.art/gateway/single-momma.jpg',
    downloadName: 'LamarCy - Momma Gone.mp3',
  },
};

export function isSku(v: unknown): v is Sku {
  return v === 'lowcountry' || v === 'momma';
}

export interface ManifestEntry {
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}
export type Manifest = Partial<Record<Sku, ManifestEntry>>;

export function singlesStore(): Store {
  return getStore({ name: 'singles', consistency: 'strong' });
}

export async function readManifest(store: Store): Promise<Manifest> {
  const m = (await store.get('manifest.json', { type: 'json' })) as Manifest | null;
  return m ?? {};
}

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  });
}
