// Tell IndexNow (Bing, Yandex, Seznam, Naver — not Google) that URLs changed.
//
// Usage:
//   node scripts/indexnow.mjs https://www.aura-looksmaxxing.com/blog/some-page ...
//   node scripts/indexnow.mjs --from-file .indexnow-urls.txt
//   node scripts/indexnow.mjs --all        # every URL in the sitemap; one-off only
//
// IndexNow is for URLs that actually changed. Resubmitting the whole site on a
// schedule is what gets a key rate-limited, so --all is opt-in and the daily
// workflow passes only the pages it just published.
//
// Env:
//   PUBLIC_SITE_URL  default https://www.aura-looksmaxxing.com
//   INDEXNOW_KEY     default KEY below; must match the file served at /<key>.txt

import fs from 'node:fs';

const SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'https://www.aura-looksmaxxing.com').replace(/\/$/, '');
const KEY = process.env.INDEXNOW_KEY ?? '12aa09fb4abee29fdfc774d3fe6b4224';
const HOST = new URL(SITE_URL).hostname;
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;

const args = process.argv.slice(2);
const fromFile = args.indexOf('--from-file');

async function sitemapUrls() {
  const index = await fetch(`${SITE_URL}/sitemap-index.xml`);
  if (!index.ok) throw new Error(`sitemap-index.xml: ${index.status} ${index.statusText}`);
  const children = [...(await index.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  const urls = [];
  for (const child of children) {
    const res = await fetch(child);
    if (!res.ok) throw new Error(`${child}: ${res.status} ${res.statusText}`);
    urls.push(...[...(await res.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]));
  }
  return urls;
}

function readUrls() {
  if (fromFile !== -1) {
    const file = args[fromFile + 1];
    if (!file) throw new Error('--from-file needs a path');
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  }
  return args.filter(a => !a.startsWith('--'));
}

// The previous version of this script pointed at a different project's domain
// and key, so it would have submitted someone else's sitemap. Proving the key
// file is actually served from this host makes that class of mistake loud.
async function assertKeyIsServed() {
  const res = await fetch(KEY_LOCATION);
  if (!res.ok) throw new Error(`Key file ${KEY_LOCATION} is not reachable (${res.status}). Deploy apps/marketing/public/${KEY}.txt first.`);
  const body = (await res.text()).trim();
  if (body !== KEY) throw new Error(`Key file ${KEY_LOCATION} serves "${body.slice(0, 40)}", expected "${KEY}".`);
}

const explicit = readUrls();
const urls = [...new Set(args.includes('--all') ? await sitemapUrls() : explicit)];

if (!urls.length) {
  console.log('No URLs to submit.');
  process.exit(0);
}

const foreign = urls.filter(u => {
  try { return new URL(u).hostname !== HOST; } catch { return true; }
});
if (foreign.length) throw new Error(`Refusing to submit URLs that are not on ${HOST}:\n  ${foreign.join('\n  ')}`);
if (urls.length > 10000) throw new Error(`IndexNow accepts at most 10000 URLs per request, got ${urls.length}.`);

await assertKeyIsServed();

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
});

// 200 accepted, 202 accepted but key still being validated. Both are fine.
if (res.status === 200 || res.status === 202) {
  console.log(`IndexNow ${res.status}: submitted ${urls.length} URL(s) for ${HOST}.`);
  for (const url of urls) console.log('  ' + url);
} else {
  console.error(`IndexNow ${res.status} ${res.statusText}: ${(await res.text()).slice(0, 500)}`);
  process.exitCode = 1;
}
