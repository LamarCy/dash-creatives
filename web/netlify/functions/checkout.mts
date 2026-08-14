// POST /store/checkout  { sku: "lowcountry" | "momma" }
// Creates a Stripe Checkout session for one single and returns { url }.
// Pay-what-you-want: a reusable Price with custom_unit_amount lets buyers
// raise the amount above the $0.99 floor right on Stripe's payment page.
import type Stripe from 'stripe';
import { CATALOG, isSku, json, stripeClient, type Track } from './lib/catalog.mts';

const PWYW_MAX_CENTS = 5000; // keep fat-finger disputes off the ledger
const priceCache = new Map<string, string>(); // warm-lambda cache

// Find-or-create the customer-chooses-price Price, registered in Stripe
// by lookup_key so test and live modes each mint their own on first sale.
async function pwywPrice(stripe: Stripe, track: Track): Promise<string> {
  const key = `single-${track.sku}-pwyw-v1`;
  const cached = priceCache.get(key);
  if (cached) return cached;
  const existing = await stripe.prices.list({ lookup_keys: [key], limit: 1 });
  let id = existing.data[0]?.id;
  if (!id) {
    const product = await stripe.products.create({
      name: `${track.title} — LamarCy single (MP3)`,
      description: `${track.catalogNo} · direct from the artist · pay what you want`,
      images: [track.cover],
    });
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      lookup_key: key,
      custom_unit_amount: {
        enabled: true,
        minimum: track.priceCents,
        preset: track.priceCents,
        maximum: PWYW_MAX_CENTS,
      },
    });
    id = price.id;
  }
  priceCache.set(key, id);
  return id;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const stripe = stripeClient();
  if (!stripe) return json({ ok: false, error: 'store_not_ready' }, 503);

  let sku: unknown;
  try {
    ({ sku } = await req.json());
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }
  if (!isSku(sku)) return json({ ok: false, error: 'unknown_sku' }, 400);
  const track = CATALOG[sku];

  const origin = req.headers.get('origin') ?? new URL(req.url).origin;

  // Preferred line item: pay-what-you-want from the floor. If Stripe balks
  // (rate limit, perms), fall back to the fixed price — never lose a sale.
  let lineItem: Stripe.Checkout.SessionCreateParams.LineItem;
  try {
    lineItem = { price: await pwywPrice(stripe, track), quantity: 1 };
  } catch (err) {
    console.error('pwyw_price_unavailable, using fixed price:', err instanceof Error ? err.message : err);
    lineItem = {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: track.priceCents,
        product_data: {
          name: `${track.title} — LamarCy single (MP3)`,
          description: `${track.catalogNo} · direct from the artist`,
          images: [track.cover],
        },
      },
    };
  }

  const params = {
    mode: 'payment' as const,
    line_items: [lineItem],
    metadata: { sku: track.sku },
    // Every buyer becomes a Stripe Customer (the CRM of record).
    customer_creation: 'always' as const,
    success_url: `${origin}/download?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?world=lamarcy#singles`,
  };

  try {
    let session;
    try {
      // Preferred: with Stripe's native marketing-consent checkbox — the
      // DASH Creatives newsletter opt-in on the payment page.
      session = await stripe.checkout.sessions.create({
        ...params,
        consent_collection: { promotions: 'auto' },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('consent_collection')) throw err;
      // Account hasn't agreed to Checkout ToS yet — never lose a sale over
      // the opt-in checkbox. Sell without it and log loudly.
      console.error('consent_collection unavailable, selling without opt-in:', msg);
      session = await stripe.checkout.sessions.create(params);
    }
    return json({ ok: true, url: session.url });
  } catch (err) {
    console.error('checkout_failed', err instanceof Error ? err.message : err);
    return json({ ok: false, error: 'checkout_failed' }, 502);
  }
};

export const config = { path: '/store/checkout' };
