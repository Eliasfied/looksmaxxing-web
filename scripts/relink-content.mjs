#!/usr/bin/env node
/**
 * relink-content.mjs
 *
 * Fills the `related:` frontmatter array of every blog post and tool page with
 * topically closest siblings, and spreads inbound links evenly.
 *
 * Why this exists: the page templates fall back to `allPosts.slice(0, 3)` when
 * `related` is empty, so every post ended up linking to the same three
 * alphabetically-first articles. That left most posts with a single inbound
 * internal link and starved them of crawl priority.
 *
 * Scoring (higher = more related):
 *   same cluster          +6
 *   each shared tag       +2
 *   each shared keyword   +1   (title + primary_keyword, stopwords removed)
 *
 * A balancing penalty of 1.5 per link a candidate has already received keeps
 * one hub page from absorbing everything.
 *
 * Run:  node scripts/relink-content.mjs [--dry-run]
 * Also invoked automatically at the end of generate-content.mjs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const COLLECTIONS = [
  { name: 'blog', dir: path.join(ROOT, 'apps/marketing/src/content/blog'), links: 3 },
  { name: 'tools', dir: path.join(ROOT, 'apps/marketing/src/content/tools'), links: 4 },
];

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'by', 'can', 'do', 'does',
  'for', 'from', 'get', 'guide', 'how', 'in', 'is', 'it', 'of', 'on', 'or',
  'the', 'to', 'vs', 'what', 'why', 'with', 'you', 'your',
]);

// ─── Minimal frontmatter reader (matches buildFrontmatter's output format) ───
function readFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawVal] = kv;
    const val = rawVal.trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1).trim();
      fm[key] = inner ? inner.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')) : [];
    } else {
      fm[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return fm;
}

function tokenize(...parts) {
  return new Set(
    parts
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

function overlap(a, b) {
  let n = 0;
  for (const x of a) if (b.has(x)) n++;
  return n;
}

function loadCollection(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
    .map(file => {
      const filePath = path.join(dir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const fm = readFrontmatter(raw);
      if (!fm?.slug) return null;
      return {
        file: filePath,
        raw,
        slug: fm.slug,
        cluster: fm.cluster ?? '',
        tags: new Set((fm.tags ?? []).map(t => t.toLowerCase())),
        words: tokenize(fm.title, fm.primary_keyword),
        current: fm.related ?? [],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function pickRelated(items, linksPerPage) {
  const inbound = new Map(items.map(i => [i.slug, 0]));
  const result = new Map();

  for (const item of items) {
    const scored = items
      .filter(o => o.slug !== item.slug)
      .map(o => {
        let score = 0;
        if (item.cluster && item.cluster === o.cluster) score += 6;
        score += 2 * overlap(item.tags, o.tags);
        score += overlap(item.words, o.words);
        return { slug: o.slug, score };
      })
      .filter(s => s.score > 0);

    // Balance: every link a candidate already received makes it less attractive.
    scored.sort((a, b) => {
      const ea = a.score - 1.5 * inbound.get(a.slug);
      const eb = b.score - 1.5 * inbound.get(b.slug);
      if (eb !== ea) return eb - ea;
      return a.slug.localeCompare(b.slug);
    });

    const picked = scored.slice(0, linksPerPage).map(s => s.slug);

    // Small collections can run out of topically scored candidates. Top the
    // list up with whichever siblings have the fewest inbound links so far, so
    // no page is left without related links and no slot goes unused.
    if (picked.length < linksPerPage) {
      const taken = new Set([...picked, item.slug]);
      const fillers = items
        .filter(o => !taken.has(o.slug))
        .sort((a, b) => inbound.get(a.slug) - inbound.get(b.slug) || a.slug.localeCompare(b.slug))
        .slice(0, linksPerPage - picked.length)
        .map(o => o.slug);
      picked.push(...fillers);
    }

    for (const slug of picked) inbound.set(slug, inbound.get(slug) + 1);
    result.set(item.slug, picked);
  }

  return { result, inbound };
}

function writeRelated(item, related) {
  const line = `related: [${related.join(', ')}]`;
  if (/^related:.*$/m.test(item.raw)) {
    return item.raw.replace(/^related:.*$/m, line);
  }
  // No related key yet: insert just before the closing fence of the frontmatter.
  return item.raw.replace(/^(---\r?\n[\s\S]*?)(\r?\n---)/, `$1\n${line}$2`);
}

export function relinkAll({ dryRun = false, quiet = false } = {}) {
  const summary = [];

  for (const { name, dir, links } of COLLECTIONS) {
    const items = loadCollection(dir);
    if (items.length < 2) continue;

    const { result, inbound } = pickRelated(items, links);
    let changed = 0;

    for (const item of items) {
      const related = result.get(item.slug) ?? [];
      if (JSON.stringify(related) === JSON.stringify(item.current)) continue;
      const next = writeRelated(item, related);
      if (next !== item.raw) {
        if (!dryRun) fs.writeFileSync(item.file, next);
        changed++;
      }
    }

    const counts = [...inbound.values()];
    const orphans = counts.filter(c => c === 0).length;
    summary.push({ name, total: items.length, changed, orphans, max: Math.max(...counts) });

    if (!quiet) {
      console.log(
        `   🔗 ${name}: ${changed}/${items.length} updated` +
          `${dryRun ? ' (dry run)' : ''}, ` +
          `${orphans} without inbound related link, max inbound ${Math.max(...counts)}`
      );
    }
  }

  return summary;
}

// Run directly (not when imported by generate-content.mjs)
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\n🔗 Relinking content${dryRun ? ' (dry run)' : ''}...`);
  relinkAll({ dryRun });
  console.log('');
}
