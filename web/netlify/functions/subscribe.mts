// POST /list/subscribe  { email, source, referrer, form }
//
// Adds a subscriber to the LamarCy Chronicle list in Kit, stamped with the
// channel that produced them. The API key never reaches the browser.
//
// Route note: NOT under /api/* — netlify.toml proxies that whole prefix to the
// Render backend with force=true, which would swallow this call.
//
// Kit v4 (v3 is deprecated and its keys don't work here). One browser call
// becomes three Kit calls, because v4 split what v3 did in one:
//   1. POST /v4/subscribers            upsert + custom fields (201 new / 200 existing)
//   2. POST /v4/forms/{id}/subscribers add to the form — fires its automation
//   3. POST /v4/tags/{id}/subscribers  the src-* channel tag
// Steps 2 and 3 require the subscriber to already exist, hence the order.

const KIT = 'https://api.kit.com/v4';

// ===================== CONFIG =====================
// Kit tag IDs, fetched from the account on 2026-08-22. v4 addresses tags by
// numeric ID, not name — regenerate with scripts if tags are ever recreated.
// `source` and `referrer` are Kit custom fields (they must exist server-side
// or the subscriber call errors).
const TAG_IDS: Record<string, number> = {
  'src-yt-shorts': 22667032,
  'src-yt-longform': 22667035,
  'src-ig-reels': 22667037,
  'src-ig-bio': 22667040,
  'src-bandcamp': 22667045,
  'src-substack': 22667046,
  'src-direct': 22667050,
  'src-footer': 22667048,
};

// source (from the client's ?s= map) → channel tag
const SOURCE_TAGS: Record<string, string> = {
  'youtube-shorts': 'src-yt-shorts',
  'youtube-longform': 'src-yt-longform',
  'instagram-reels': 'src-ig-reels',
  'instagram-bio': 'src-ig-bio',
  bandcamp: 'src-bandcamp',
  substack: 'src-substack',
  direct: 'src-direct',
};

// The gateway footer's one-liner gets this tag *alongside* its channel tag.
const FOOTER_FORM = 'footer';
const FOOTER_TAG = 'src-footer';
// ==================================================

const MAX_BODY = 2048;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// Kit's raw responses never reach the browser — log them, return our own shape.
const fail = (why: string, status = 502) => {
  console.error('subscribe_failed:', why);
  return json({ ok: false, message: 'That didn’t go through. Try again?' }, status);
};

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ ok: false, message: 'method_not_allowed' }, 405);

  const key = process.env.KIT_API_KEY;
  const formId = process.env.KIT_FORM_ID;
  if (!key || !formId) return fail('KIT_API_KEY or KIT_FORM_ID not set', 503);

  const raw = await req.text();
  if (!raw || raw.length > MAX_BODY) return fail(`payload size ${raw.length}`, 400);

  let body: any;
  try { body = JSON.parse(raw); } catch { return fail('bad json', 400); }

  // Honeypot: a real person never fills this. Look successful, store nothing.
  if (typeof body.company === 'string' && body.company.trim()) {
    console.log('honeypot tripped, dropping');
    return json({ ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!EMAIL_RE.test(email) || email.length > 200) return fail('invalid email shape', 400);

  const source = typeof body.source === 'string' && SOURCE_TAGS[body.source] ? body.source : 'direct';
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : '';
  const formKind = typeof body.form === 'string' ? body.form.slice(0, 40) : '';

  const headers = { 'X-Kit-Api-Key': key, 'content-type': 'application/json' };
  const call = (path: string, payload: unknown) =>
    fetch(KIT + path, { method: 'POST', headers, body: JSON.stringify(payload) });

  // 1. Upsert the subscriber with the attribution fields. This is the step
  //    that must succeed — everything after it is enrichment.
  try {
    const r = await call('/subscribers', {
      email_address: email,
      fields: { source, referrer },
    });
    if (r.status !== 200 && r.status !== 201 && r.status !== 202) {
      return fail(`create subscriber ${r.status}: ${(await r.text()).slice(0, 300)}`);
    }
  } catch (err) {
    return fail(`create subscriber threw: ${err instanceof Error ? err.message : err}`);
  }

  // 2 + 3. Form membership and tags. The address is already captured, so a
  // failure here is logged but never shown to the visitor.
  const tags = [SOURCE_TAGS[source]];
  if (formKind === FOOTER_FORM) tags.push(FOOTER_TAG);

  const enrich = [
    call(`/forms/${formId}/subscribers`, { email_address: email, referrer }).then((r) => {
      if (r.status !== 200 && r.status !== 201) console.error('add-to-form status', r.status);
    }),
    ...tags.map((name) => {
      const id = TAG_IDS[name];
      if (!id) { console.error('unknown tag', name); return Promise.resolve(); }
      return call(`/tags/${id}/subscribers`, { email_address: email }).then((r) => {
        if (r.status !== 200 && r.status !== 201) console.error(`tag ${name} status`, r.status);
      });
    }),
  ];
  await Promise.allSettled(enrich);

  console.log(`subscribed ok · source=${source} · tags=${tags.join(',')} · form=${formKind || 'chronicle'}`);
  return json({ ok: true });
};

export const config = { path: '/list/subscribe' };
