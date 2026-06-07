-- Dash Creatives — initial schema
-- Apply with: supabase db push   (or paste into Supabase SQL editor)

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ── contact_submissions ───────────────────────────────────────────
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email citext not null,
  subject text,
  message text not null,
  source text default 'website',
  ip inet,
  user_agent text,
  status text default 'new',
  responded_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists contact_submissions_created_at_idx on public.contact_submissions (created_at desc);
alter table public.contact_submissions enable row level security;
-- No anon policies: only service-role (backend) can read/write.

-- ── events ────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  where_text text,
  city text,
  country text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  url text,
  status text default 'upcoming' check (status in ('upcoming','past','cancelled')),
  notes text,
  created_at timestamptz default now()
);
create index if not exists events_starts_at_idx on public.events (starts_at);
alter table public.events enable row level security;
drop policy if exists "events: anon read upcoming" on public.events;
create policy "events: anon read upcoming"
  on public.events for select
  to anon, authenticated
  using (status = 'upcoming');

-- ── products ──────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  type text check (type in ('original','print','mixed-media','music')),
  price_cents integer,
  currency text default 'USD',
  status text default 'draft' check (status in ('listed','sold','reserved','draft')),
  image_path text,
  alt text,
  badge text,
  sort_order integer default 100,
  created_at timestamptz default now()
);
create index if not exists products_status_sort_idx on public.products (status, sort_order);
alter table public.products enable row level security;
drop policy if exists "products: anon read listed" on public.products;
create policy "products: anon read listed"
  on public.products for select
  to anon, authenticated
  using (status = 'listed');

-- ── commission_tiers ──────────────────────────────────────────────
create table if not exists public.commission_tiers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  subtitle text,
  price_from_cents integer,
  price_display text,
  sort_order integer default 100,
  created_at timestamptz default now()
);
alter table public.commission_tiers enable row level security;
drop policy if exists "commission_tiers: anon read all" on public.commission_tiers;
create policy "commission_tiers: anon read all"
  on public.commission_tiers for select
  to anon, authenticated
  using (true);

-- ── commissions ───────────────────────────────────────────────────
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  tier_slug text,
  name text not null,
  email citext not null,
  budget text,
  brief text not null,
  status text default 'new',
  created_at timestamptz default now()
);
create index if not exists commissions_created_at_idx on public.commissions (created_at desc);
alter table public.commissions enable row level security;
-- No anon policies — backend-only via service-role.

-- ── seed data (optional; safe to re-run) ──────────────────────────
insert into public.commission_tiers (slug, name, subtitle, price_display, sort_order)
values
  ('sketch-study',       'Sketch Study',           'Ink on paper · 4–6 weeks',                            'from $80', 10),
  ('watercolor-gouache', 'Watercolor or Gouache',  'On paper · 8–10 weeks',                               'from $80', 20),
  ('collectors-original','Collector''s Original',  'Mixed media assemblage · Gallery-quality · By inquiry','Inquire',  30),
  ('oil-on-canvas',      'Oil on Canvas',          'Large-scale · By inquiry',                            'Inquire',  40),
  ('book-editorial',     'Book & Editorial',       'Covers, interiors, spot illustration',                'Inquire',  50)
on conflict (slug) do nothing;
