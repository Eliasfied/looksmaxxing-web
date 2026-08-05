// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const buildDate = new Date().toISOString();

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://aura-looksmaxxing.com',
  output: 'static',
  // Must match the vercel.json redirect that strips trailing slashes,
  // otherwise every sitemap URL 301s and never gets indexed.
  trailingSlash: 'never',
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
