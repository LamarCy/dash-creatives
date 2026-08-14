// GET /store/download?session_id=cs_...           → streams the purchased MP3
// GET /store/download?session_id=cs_...&probe=1   → JSON state for the /download page
import { CATALOG, isSku, json, readManifest, singlesStore, stripeClient } from './lib/catalog.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id') ?? '';
  const probe = url.searchParams.get('probe') === '1';
  if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) return json({ ok: false, error: 'bad_session_id' }, 400);

  const stripe = stripeClient();
  if (!stripe) return json({ ok: false, error: 'store_not_ready' }, 503);

  let paymentStatus: string;
  let sku: unknown;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paymentStatus = session.payment_status;
    sku = session.metadata?.sku;
  } catch (err) {
    console.error('session_lookup_failed', err instanceof Error ? err.message : err);
    return json({ ok: false, error: 'session_not_found' }, 404);
  }

  if (!isSku(sku)) return json({ ok: false, error: 'unknown_sku' }, 404);
  const track = CATALOG[sku];
  const paid = paymentStatus === 'paid';

  if (probe) {
    return json({
      ok: true,
      paid,
      status: paymentStatus,
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
