// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// ─── Real lastmod dates for the sitemap ─────────────────────────────────────
// Stamping every URL with the build date makes lastmod worthless: all 130+
// entries change on every deploy, so Google learns to ignore the field. Read
// the actual pubDate/updatedDate out of the content frontmatter instead, and
// leave lastmod off entirely for pages we have no honest date for.
const CONTENT_SECTIONS = ['blog', 'glossary', 'tools'];
const CONFIG_DIR = path.dirname(fileURLToPath(import.meta.url));

function readContentDates() {
  /** @type {Map<string, string>} */
  const byPath = new Map();
  /** @type {Map<string, string>} */
  const newestPerSection = new Map();

  for (const section of CONTENT_SECTIONS) {
    const dir = path.join(CONFIG_DIR, 'src/content', section);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!/\.mdx?$/.test(file)) continue;
      const fm = fs.readFileSync(path.join(dir, file), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fm) continue;

      const slug = fm[1].match(/^slug:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
      const pub = fm[1].match(/^pubDate:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
      const upd = fm[1].match(/^updatedDate:\s*(.+)$/m)?.[1].trim().replace(/^["']|["']$/g, '');
      const date = new Date(upd || pub || '');
      if (!slug || Number.isNaN(date.valueOf())) continue;

      const iso = date.toISOString();
      byPath.set(`/${section}/${slug}`, iso);
      if (!newestPerSection.has(section) || iso > newestPerSection.get(section)) {
        newestPerSection.set(section, iso);
      }
    }
  }

  // Index pages genuinely change when their newest entry changes.
  for (const [section, iso] of newestPerSection) byPath.set(`/${section}`, iso);
  const newestOverall = [...newestPerSection.values()].sort().pop();
  if (newestOverall) byPath.set('/', newestOverall);

  return byPath;
}

const lastmodByPath = readContentDates();

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://www.aura-looksmaxxing.com',
  output: 'static',
  // Must match the vercel.json redirect that strips trailing slashes,
  // otherwise every sitemap URL 301s and never gets indexed.
  trailingSlash: 'never',
  integrations: [
    sitemap({
      serialize(item) {
        const pathname = new URL(item.url).pathname.replace(/\/$/, '') || '/';
        const lastmod = lastmodByPath.get(pathname);
        // No frontmatter date (about, pricing, faq, legal): omit lastmod rather
        // than claim a fake one.
        return lastmod ? { ...item, lastmod } : { ...item, lastmod: undefined };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
