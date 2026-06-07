import { defineConfig } from 'astro/config';

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://dash-creatives.netlify.app';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
