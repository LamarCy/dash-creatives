// GET /store/play?sku=lowcountry — streams the single inline for the on-site
// player. Supports Range requests so <audio> can seek. Streaming is free by
// design (same posture as Bandcamp's full-track streaming); the $0.99 buys
// the file, the receipt, and the direct support.
import { isSku, json, readManifest, singlesStore } from './lib/catalog.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const sku = new URL(req.url).searchParams.get('sku');
  if (!isSku(sku)) return json({ ok: false, error: 'unknown_sku' }, 400);

  const store = singlesStore();
  const manifest = await readManifest(store);
  const entry = manifest[sku];
  const buf = (await store.get(`files/${sku}`, { type: 'arrayBuffer' })) as ArrayBuffer | null;
  if (!entry || !buf) return json({ ok: false, error: 'file_not_uploaded' }, 404);

  const total = buf.byteLength;
  const type = entry.contentType || 'audio/mpeg';
  const base = {
    'content-type': type,
    'accept-ranges': 'bytes',
    'cache-control': 'public, max-age=3600',
  };

  const range = req.headers.get('range');
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m && (m[1] || m[2])) {
    let start = m[1] ? parseInt(m[1], 10) : Math.max(0, total - parseInt(m[2], 10));
    let end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), total - 1) : total - 1;
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
      return new Response(null, { status: 416, headers: { ...base, 'content-range': `bytes */${total}` } });
    }
    return new Response(buf.slice(start, end + 1), {
      status: 206,
      headers: {
        ...base,
        'content-range': `bytes ${start}-${end}/${total}`,
        'content-length': String(end - start + 1),
      },
    });
  }

  return new Response(buf, { status: 200, headers: { ...base, 'content-length': String(total) } });
};

export const config = { path: '/store/play' };
