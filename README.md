# Dash Creatives

Artist portfolio for **Dash Creatives** — original paintings, mixed media assemblage,
music, and commissions. Restructured from a single 87 MB `index.html` into a proper
monorepo with a static Astro frontend and a small Express + Supabase backend.

> Live site: https://dash-creatives.netlify.app (Netlify-hosted frontend)

---

## Status

| Area               | State                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Visual design      | Ported 1:1 from the original handmade HTML/CSS — no framework recolor |
| Gallery / Shop     | Static, driven by `web/src/data/artworks.ts` (20 unique artworks)      |
| Contact form       | Wired to backend `POST /api/contact` with honeypot + rate limit       |
| Events             | Static array today; Supabase-backed when seeded                       |
| Commissions        | Static tiers; Supabase `commission_tiers` table + inquiry POST ready  |
| Shop checkout      | Not wired (shop is "Inquire"-only by design)                          |
| Auth / Admin       | Not yet                                                               |

---

## Folder structure

```
.
├── package.json              # npm workspaces root
├── netlify.toml              # Netlify build config (frontend)
├── tools/
│   ├── extract-images.mjs    # one-shot legacy → /images/ extractor
│   └── image-manifest.json   # generated; keyed by data-artwork id
├── legacy/
│   └── index.html            # original 87 MB single-file site (gitignored)
├── web/                      # Astro 4 static site → web/dist/
│   ├── astro.config.mjs
│   ├── public/images/        # 20 extracted artwork files
│   └── src/
│       ├── pages/            # index.astro · thanks.astro · 404.astro
│       ├── layouts/          # BaseLayout.astro
│       ├── components/       # Nav · Hero · Gallery · Statement · Music · Events · Shop · Commissions · Contact · Footer · Lightbox · YouTubeLite
│       ├── scripts/          # scroll-reveal.ts · lightbox.ts · contact-form.ts
│       ├── data/             # artworks · tracks · tiers · events
│       └── styles/           # tokens.css + global.css
├── backend/                  # Express + TypeScript API
│   ├── Dockerfile
│   └── src/
│       ├── app.ts            # factory: helmet · cors · routes · error handler
│       ├── index.ts          # bootstrap
│       ├── config/           # env (zod-validated) · supabase client
│       ├── middleware/       # cors · rateLimit · errorHandler
│       ├── routes/           # health · contact · events · products · commissions
│       ├── services/         # contact · email · products · events
│       └── schemas/          # zod input schemas
└── supabase/
    └── migrations/0001_init.sql  # all tables + RLS + seed tiers
```

---

## Tech stack

- **Frontend** — Astro 4 (static output), TypeScript, vanilla JS for the lightbox + scroll-reveal, `@fontsource` for self-hosted EB Garamond & DM Mono.
- **Backend** — Node 20, Express 4, TypeScript, Zod, `pino-http`, `helmet`, `express-rate-limit`.
- **Data** — Supabase (Postgres + RLS). Frontend reads via anon key; backend writes via service-role.
- **Email** — Resend (transactional). No-op in dev if `RESEND_API_KEY` is unset.
- **Hosting** — Netlify for `web/dist/`; backend deploys separately (Render / Fly / Railway).

---

## Prerequisites

- Node **20** (`.nvmrc` is set; run `nvm use`)
- npm **10+**
- A Supabase project (free tier is fine) — optional for local dev
- A Resend API key — optional; the backend logs to stdout when missing

---

## Setup

```bash
git clone https://github.com/LamarCy/dash-creatives.git
cd dash-creatives
nvm use
npm install

# Copy and fill in env files (Supabase keys, Resend, etc.)
cp web/.env.example     web/.env
cp backend/.env.example backend/.env

# One-time only — only needed if you're re-importing legacy/index.html
# (images are already extracted in web/public/images/)
npm run extract:images

# Boot both servers
npm run dev
# → Astro at http://localhost:4321
# → API   at http://localhost:3000
```

The site works without Supabase configured — the contact form will log to the
backend's stdout and the email service is a no-op when `RESEND_API_KEY` is empty.

---

## Environment variables

### `web/.env`

| Var                          | Required | Purpose                                                |
| ---------------------------- | -------- | ------------------------------------------------------ |
| `PUBLIC_SITE_URL`            | Yes      | Canonical URL · OG tags · sitemap                      |
| `PUBLIC_API_BASE_URL`        | Yes      | Where the contact form POSTs                           |
| `PUBLIC_SUPABASE_URL`        | Optional | If reading products/events directly via anon key       |
| `PUBLIC_SUPABASE_ANON_KEY`   | Optional | Same — RLS-protected                                   |
| `PUBLIC_YOUTUBE_FEATURED_ID` | Optional | Defaults to `EdFSDXgwF4U` (Momma Gone)                 |

> Astro convention: only `PUBLIC_*` env vars are exposed to the client bundle.

### `backend/.env`

| Var                          | Required | Purpose                                                          |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| `PORT`                       | No       | Defaults to 3000                                                 |
| `CORS_ORIGINS`               | Yes      | Comma-separated allow-list                                       |
| `SUPABASE_URL`               | Yes\*    | Required to persist submissions                                  |
| `SUPABASE_SERVICE_ROLE_KEY`  | Yes\*    | **Server-only — never put this in `web/.env`**                   |
| `SUPABASE_ANON_KEY`          | No       | For server-side anon reads (rare)                                |
| `RESEND_API_KEY`             | No       | If unset, email sending is logged but not performed              |
| `CONTACT_NOTIFY_TO`          | Yes      | Inbox that receives contact form mail                            |
| `CONTACT_FROM`               | Yes      | Verified Resend sender                                           |
| `RATE_LIMIT_WINDOW_MS`       | No       | Default 60_000 ms                                                |
| `RATE_LIMIT_MAX`             | No       | Default 5 per IP per window                                      |

\* Missing Supabase config is tolerated — the API logs and returns 200, so the
form works locally without it.

---

## Common commands

```bash
npm run dev              # Both servers in parallel
npm run dev:web          # Astro only
npm run dev:api          # Express only
npm run build            # Astro static build + tsc backend build
npm run extract:images   # Re-extract base64 → web/public/images/ (idempotent)
npm run typecheck        # All workspaces
npm run format           # Prettier across the monorepo
```

---

## Supabase

Apply the schema once:

```bash
# Option A — Supabase CLI (recommended)
supabase db push

# Option B — paste supabase/migrations/0001_init.sql into the SQL editor
```

The migration:

- creates `contact_submissions`, `events`, `products`, `commission_tiers`, `commissions`
- enables RLS on every table
- grants `anon` read on `events (status='upcoming')`, `products (status='listed')`, and `commission_tiers`
- keeps write tables (`contact_submissions`, `commissions`) backend-only via service-role
- seeds the five default commission tiers

Seed the shop from the static artwork list at your leisure — see
`supabase/seed/products-from-manifest.md` for the SQL template.

---

## Deployment

### Frontend (Netlify)

1. Connect the GitHub repo.
2. `netlify.toml` already declares `base = "web"`, `publish = "dist"`, `command = "npm run build"`.
3. Set `PUBLIC_SITE_URL`, `PUBLIC_API_BASE_URL`, `PUBLIC_SUPABASE_URL`,
   `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_YOUTUBE_FEATURED_ID` in the Netlify env panel.
4. The `[[redirects]]` in `netlify.toml` forwards `/api/*` to the backend so the
   frontend can use a same-origin path in prod.

### Backend (Render / Fly / Railway)

1. Point the host at the `backend/` Dockerfile, or set the build command to
   `npm install && npm run build -w backend` and start command to
   `node backend/dist/index.js`.
2. Set every `backend/.env.example` var in the host's secrets UI.
3. Update `netlify.toml`'s `[[redirects]] to → https://your-host/api/:splat`.

### Cold-start note

Render's free tier sleeps after 15 min idle — first POST after sleep is ~30 s.
Either keep it warm via a cron pinger, or move just `/api/contact` to a Netlify
Function colocated with the frontend.

---

## Image pipeline

`web/public/images/` is the source of truth. **Never re-inline base64 into the
HTML.** If new artwork is added, drop the image into `web/public/images/` and
add an entry to `web/src/data/artworks.ts` (or seed `products` directly when
the shop migrates to Supabase).

The original 87 MB single-file site lives at `legacy/index.html` (gitignored)
for one-time re-extraction only.

---

## License & contact

- Code: MIT.
- Artwork copyright belongs to the artist.
- Questions: info@secondlifesoftware.com
