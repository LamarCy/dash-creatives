// GET /store/status → { ready, stripe, files } — the Buy buttons only appear
// for a sku when Stripe is configured AND that master is uploaded to Blobs.
import { json, readManifest, singlesStore } from './lib/catalog.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);
  let files: Record<string, boolean> = { lowcountry: false, momma: false };
  try {
    const manifest = await readManifest(singlesStore());
    files = { lowcountry: Boolean(manifest.lowcountry), momma: Boolean(manifest.momma) };
  } catch (err) {
    console.error('manifest_read_failed', err instanceof Error ? err.message : err);
  }

  return json({
    ok: true,
    stripe: stripeReady,
    files,
    ready: { lowcountry: stripeReady && files.lowcountry, momma: stripeReady && files.momma },
  });
};

export const config = { path: '/store/status' };
