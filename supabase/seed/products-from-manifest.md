# Seeding `products` from extracted artworks

The Astro frontend ships a static `web/src/data/artworks.ts` populated from the
extracted image manifest. When you're ready to move the shop into Supabase:

1. Run the SQL in `supabase/migrations/0001_init.sql` once against your project.
2. For each artwork in `web/src/data/artworks.ts`, insert a row into `products`:

```sql
insert into public.products (slug, name, description, type, status, image_path, alt, badge, sort_order)
values
  ('palm-springs',       'Palm Springs', '…description…', 'original', 'listed', '/images/palm-springs.png', 'Palm Springs', 'New', 20),
  ('the-songwriter-2',   'The Songwriter 2', '…',          'original', 'listed', '/images/the-songwriter-2.png', 'The Songwriter 2', 'New', 10);
-- etc.
```

3. Once seeded, switch `web/src/components/Shop.astro` from `@/data/artworks`
   to a build-time fetch:

```ts
const res = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/api/products`);
const { products } = await res.json();
```

Until then the frontend renders fine without Supabase.
