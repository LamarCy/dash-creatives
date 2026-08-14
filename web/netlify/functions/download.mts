// GET /store/download?session_id=cs_...           → streams the purchased MP3
// GET /store/download?session_id=cs_...&probe=1   → JSON state for the /download page
import { CATALOG, customersStore, isSku, json, readManifest, singlesStore, stripeClient } from './lib/catalog.mts';
import type Stripe from 'stripe';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id') ?? '';
  const probe = url.searchParams.get('probe') === '1';
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return json({ ok: false, error: 'bad_session_id' }, 400);

  const stripe = stripeClient();
  if (!stripe) return json({ ok: false, error: 'store_not_ready' }, 503);

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    console.error('session_lookup_failed', err instanceof Error ? err.message : err);
    return json({ ok: false, error: 'session_not_found' }, 404);
  }

  const sku = session.metadata?.sku;
  if (!isSku(sku)) return json({ ok: false, error: 'unknown_sku' }, 404);
  const track = CATALOG[sku];
  const paid = session.payment_status === 'paid';

  // Marketing capture — idempotent (keyed by session), never blocks delivery.
  if (paid) {
    try {
      await customersStore().setJSON(`sessions/${session.id}`, {
        email: session.customer_details?.email ?? null,
        name: session.customer_details?.name ?? null,
        country: session.customer_details?.address?.country ?? null,
        newsletterOptIn: session.consent?.promotions === 'opt_in',
        sku: track.sku,
        title: track.title,
        amountCents: session.amount_total,
        currency: session.currency,
        purchasedAt: new Date((session.created ?? 0) * 1000).toISOString(),
        stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
      });
    } catch (err) {
      console.error('customer_capture_failed', err instanceof Error ? err.message : err);
    }
  }

  if (probe) {
    return json({
      ok: true,
      paid,
      status: session.payment_status,
      track: { sku: track.sku, title: track.title, catalogNo: track.catalogNo, downloadName: track.downloadName },
    });
  }

  if (!paid) return json({ ok: false, error: 'not_paid', status: paymentStatus }, 402);

  const store = singlesStore();
  const manifest = await readManifest(store);
  const entry = manifest[track.sku];
  const stream = await store.get(`files/${track.sku}`, { type: 'stream' });
  if (!entry || !stream) return json({ ok: false, error: 'file_not_uploaded' }, 404);

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': entry.contentType || 'audio/mpeg',
      'content-length': String(entry.size),
      'content-disposition': `attachment; filename="${track.downloadName.replace(/"/g, '')}"`,
      'cache-control': 'no-store',
    },
  });
};

export const config = { path: '/store/download' };
