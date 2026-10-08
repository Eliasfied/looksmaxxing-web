// Read-only verified billing report. No photos or report contents are queried.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of ['apps/web/.env.local', '.env.local']) {
  const target = path.join(root, file);
  if (fs.existsSync(target)) for (const line of fs.readFileSync(target, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
const rawDays = process.argv[process.argv.indexOf('--days') + 1];
const days = process.argv.includes('--days') ? Number(rawDays) : 28;
if (!Number.isInteger(days) || days < 1 || days > 366) throw new Error('Use --days between 1 and 366');
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) });
const cutoff = new Date(Date.now() - days * 86400000).toISOString();
const snapshot = await getFirestore().collection('tool_funnel_events').where('createdAt', '>=', cutoff).get();
const events = snapshot.docs.map(d => d.data());
const purchases = events.filter(e => e.event === 'verified_purchase' && e.environment === 'PRODUCTION' && typeof e.amountUsd === 'number' && e.amountUsd > 0);
const buyers = new Set(purchases.filter(e => !e.renewal).map(e => e.userId));
const format = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
const byDay = new Map();
for (let day = 0; day < days; day++) byDay.set(format.format(new Date(Date.now() - day * 86400000)), { buyers: new Set(), newBuyers: new Set(), revenue: 0 });
for (const event of purchases) {
  const date = format.format(new Date(event.createdAt));
  const row = byDay.get(date);
  if (!row) continue;
  if (!event.renewal) row.buyers.add(event.userId);
  if (event.firstBuyer) row.newBuyers.add(event.userId);
  row.revenue += event.amountUsd;
}
console.log(JSON.stringify({
  days, verifiedBuyers: buyers.size, verifiedPurchases: purchases.length,
  revenueUsd: Number(purchases.reduce((sum,e)=>sum+e.amountUsd,0).toFixed(2)),
  unlockedReports: events.filter(e=>e.event==='report_unlocked').length,
  daysWithBuyer: [...byDay.values()].filter(day=>day.buyers.size>0).length,
  daily: [...byDay].sort(([a],[b])=>a.localeCompare(b)).map(([date,row])=>({date,buyers:row.buyers.size,newBuyers:row.newBuyers.size,revenueUsd:Number(row.revenue.toFixed(2))})),
  note: 'Gross recorded purchases before refunds, tax and fees. Missing-price events and sandbox purchases are excluded. Historical purchases before this instrumentation are not backfilled.',
}, null, 2));
