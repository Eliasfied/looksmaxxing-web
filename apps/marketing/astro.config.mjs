// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const buildDate = new Date().toISOString();

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://yourdomain.com',
  output: 'static',
  integrations: [
    sitemap({
      serialize(item) {
        return { ...item, lastmod: buildDate };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
