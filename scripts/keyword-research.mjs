#!/usr/bin/env node
/**
 * keyword-research.mjs
 *
 * Measures candidate keywords against DataForSEO and emits rows for
 * keywords.csv. Nothing here estimates a volume: the daily run picks the
 * highest-volume pending page, so a guessed number does not just sit in a
 * column, it jumps the queue ahead of terms that were actually measured.
 * A keyword DataForSEO has no volume for is reported and dropped.
 *
 * Usage:
 *   node scripts/keyword-research.mjs --seeds scripts/keyword-gaps.txt
 *   node scripts/keyword-research.mjs --seeds <file> --ideas        # related terms too
 *   node scripts/keyword-research.mjs --seeds <file> --emit-csv     # rows for keywords.csv
 *
 * Env (in .env.local):
 *   DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const envFile of ['.env.local', 'scripts/.env.local']) {
  const envPath = path.join(ROOT, envFile);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const val = m[2].replace(/\r$/, '').replace(/^['"]|['"]$/g, '');
    if (val && !process.env[m[1]]) process.env[m[1]] = val;
  }
}

const args = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const SEEDS = getArg('--seeds');
const WANT_IDEAS = args.includes('--ideas');
const EMIT_CSV = args.includes('--emit-csv');
const LOCATION = parseInt(getArg('--location') ?? '2840', 10); // 2840 = United States
const LANGUAGE = getArg('--language') ?? 'en';

const API = 'https://api.dataforseo.com/v3';

function auth() {
  const login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new Error(
      'DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD are required.\n' +
      'Add them to .env.local:\n' +
      '  DATAFORSEO_LOGIN=your-api-login\n' +
      '  DATAFORSEO_PASSWORD=your-api-password\n' +
      'They are the API credentials from dataforseo.com/, not the dashboard sign-in.',
    );
  }
  return 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64');
}

async function post(endpoint, body) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status} ${res.statusText}`);
  const task = json?.tasks?.[0];
  if (!task) throw new Error(`${endpoint}: no task in response`);
  if (task.status_code !== 20000) throw new Error(`${endpoint}: ${task.status_code} ${task.status_message}`);
  return task.result ?? [];
}

// Monthly search volume, straight from Google Ads data.
async function searchVolume(keywords) {
  const out = new Map();
  for (let i = 0; i < keywords.length; i += 700) {
    const batch = keywords.slice(i, i + 700);
    const result = await post('/keywords_data/google_ads/search_volume/live', [
      { keywords: batch, location_code: LOCATION, language_code: LANGUAGE },
    ]);
    for (const row of result) {
      if (typeof row?.keyword !== 'string') continue;
      out.set(row.keyword.toLowerCase(), {
        volume: typeof row.search_volume === 'number' ? row.search_volume : null,
        cpc: typeof row.cpc === 'number' ? row.cpc : null,
        competition: typeof row.competition_index === 'number' ? row.competition_index : null,
      });
    }
  }
  return out;
}

// SEO difficulty, which is a different thing from the ads competition index
// above and is what the csv's `sd` column means.
async function difficulty(keywords) {
  const out = new Map();
  for (let i = 0; i < keywords.length; i += 1000) {
    const batch = keywords.slice(i, i + 1000);
    const result = await post('/dataforseo_labs/google/bulk_keyword_difficulty/live', [
      { keywords: batch, location_code: LOCATION, language_code: LANGUAGE },
    ]);
    for (const row of result?.[0]?.items ?? result ?? []) {
      if (typeof row?.keyword === 'string' && typeof row.keyword_difficulty === 'number') {
        out.set(row.keyword.toLowerCase(), row.keyword_difficulty);
      }
    }
  }
  return out;
}

// Related terms DataForSEO sees around the seeds, so a cluster is not limited
// to what we thought of.
async function keywordIdeas(seeds) {
  const result = await post('/dataforseo_labs/google/keyword_ideas/live', [
    { keywords: seeds.slice(0, 200), location_code: LOCATION, language_code: LANGUAGE, limit: 500,
      filters: [['keyword_info.search_volume', '>', 100]],
      order_by: ['keyword_info.search_volume,desc'] },
  ]);
  return (result?.[0]?.items ?? [])
    .map(i => i?.keyword)
    .filter(k => typeof k === 'string');
}

export const slugify = keyword => keyword.toLowerCase().trim()
  .replace(/['']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function csvRow({ keyword, volume, sd, cluster, slug, phase }) {
  return [keyword, volume, sd ?? '', cluster, slug, 'pending', 'blog', 'yes', phase ?? 5].join(',');
}

async function main() {
  if (!SEEDS) throw new Error('--seeds <file> is required (one keyword per line, # for comments)');
  const seedPath = path.isAbsolute(SEEDS) ? SEEDS : path.join(ROOT, SEEDS);
  if (!fs.existsSync(seedPath)) throw new Error(`Seed file not found: ${seedPath}`);
  const seeds = [...new Set(fs.readFileSync(seedPath, 'utf8').split('\n')
    .map(l => l.replace(/#.*$/, '').trim().toLowerCase()).filter(Boolean))];
  if (!seeds.length) throw new Error('Seed file is empty');

  let keywords = seeds;
  if (WANT_IDEAS) {
    const ideas = await keywordIdeas(seeds);
    keywords = [...new Set([...seeds, ...ideas.map(k => k.toLowerCase())])];
    console.error(`Seeds: ${seeds.length}. Related terms from DataForSEO: ${ideas.length}. Measuring ${keywords.length}.`);
  }

  const volumes = await searchVolume(keywords);
  const measured = keywords
    .map(k => ({ keyword: k, ...(volumes.get(k) ?? { volume: null }) }))
    .filter(r => typeof r.volume === 'number' && r.volume > 0)
    .sort((a, b) => b.volume - a.volume);
  const dropped = keywords.length - measured.length;

  const sd = await difficulty(measured.map(r => r.keyword)).catch(err => {
    console.error('Difficulty lookup failed, leaving sd blank: ' + err.message);
    return new Map();
  });

  if (EMIT_CSV) {
    for (const row of measured) {
      const slug = slugify(row.keyword);
      process.stdout.write(csvRow({ keyword: row.keyword, volume: row.volume, sd: sd.get(row.keyword), cluster: slug, slug, phase: 5 }) + '\n');
    }
  } else {
    console.log('volume'.padStart(7), 'sd'.padStart(4), 'cpc'.padStart(6), ' keyword');
    for (const row of measured) {
      console.log(String(row.volume).padStart(7), String(sd.get(row.keyword) ?? '-').padStart(4), String(row.cpc ?? '-').padStart(6), ' ' + row.keyword);
    }
  }
  console.error(`\n${measured.length} keyword(s) with a measured volume; ${dropped} had none and were dropped.`);
}

// Only when run as a command. Importing this module, as the tests do, must not
// start a research run or set an exit code.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
