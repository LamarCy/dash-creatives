import { defineConfig } from 'astro/config';

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://cprice.studio';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
