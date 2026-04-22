// Run after deploy to notify Bing/IndexNow of updated URLs
// Usage: node scripts/indexnow.mjs
// Automatically reads all URLs from the live sitemap.
//
// Setup:
// 1. Get an IndexNow key from https://www.bing.com/indexnow
// 2. Set KEY and HOST below (or use env vars)
// 3. Place a file at public/${KEY}.txt containing just the key

const KEY = process.env.INDEXNOW_KEY ?? 'your-indexnow-key-here';
const HOST = process.env.PUBLIC_SITE_URL
  ? new URL(process.env.PUBLIC_SITE_URL).hostname
  : 'yourdomain.com';
const SITE_URL = process.env.PUBLIC_SITE_URL ?? `https://${HOST}`;

// Fetch and parse sitemap
async function getUrlsFromSitemap() {
  const res = await fetch(`${SITE_URL}/sitemap-0.xml`);
  const xml = await res.text();
  const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
  return [...matches].map(m => m[1]);
}

const urls = await getUrlsFromSitemap();
console.log(`Found ${urls.length} URLs in sitemap.`);

const body = {
  host: HOST,
  key: KEY,
  keyLocation: `${SITE_URL}/${KEY}.txt`,
  urlList: urls,
};

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

console.log(`IndexNow: ${res.status} ${res.statusText}`);
if (res.status === 200) {
  console.log(`Submitted ${urls.length} URLs to IndexNow.`);
} else {
  const text = await res.text();
  console.error('Response:', text);
}
