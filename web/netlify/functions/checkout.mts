// POST /store/checkout  { sku: "lowcountry" | "momma" }
// Creates a Stripe Checkout session for one single and returns { url }.
import { CATALOG, isSku, json, stripeClient } from './lib/catalog.mts';

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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
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
        },
      ],
      metadata: { sku: track.sku },
      success_url: `${origin}/download?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?world=lamarcy#singles`,
    });
    return json({ ok: true, url: session.url });
  } catch (err) {
    console.error('checkout_failed', err instanceof Error ? err.message : err);
    return json({ ok: false, error: 'checkout_failed' }, 502);
  }
};

export const config = { path: '/store/checkout' };
