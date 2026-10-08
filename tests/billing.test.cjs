const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { FakeFirestore } = require('./helpers/fake-firestore.cjs');
const { applyRevenueCatEvent } = loadTs('apps/web/lib/revenuecat-events.ts');
const event = (extra = {}) => ({ id: 'event-1', type: 'NON_RENEWING_PURCHASE', app_user_id: 'buyer', product_id: 'aura_starter_pack', price: 2.99, price_in_purchased_currency: 2.99, currency: 'USD', environment: 'PRODUCTION', event_timestamp_ms: Date.now(), transaction_id: 'transaction-1', store: 'RC_BILLING', ...extra });
function db() { return new FakeFirestore({ 'users/buyer': { has_purchased: false }, 'credits/buyer': { subscription_credits: 0, topup_credits: 2 }, 'credit_packs/starter': { revenuecat_product_id: 'aura_starter_pack', credits: 5 }, 'plans/monthly': { revenuecat_product_id: 'aura_monthly', monthly_credits: 100, name: 'Monthly' } }); }
test('duplicate and concurrent delivery of a paid transaction only grants once', async () => {
  const database = db(), purchase = event();
  await Promise.all([applyRevenueCatEvent(database,purchase), applyRevenueCatEvent(database,purchase)]);
  await applyRevenueCatEvent(database,event({ id: 'different-event-same-transaction' }));
  assert.equal(database.data.get('credits/buyer').topup_credits, 7);
  assert.equal(database.data.get('users/buyer').has_purchased, true);
  const events = [...database.data].filter(([path]) => path.startsWith('tool_funnel_events/'));
  assert.equal(events.length, 1); assert.equal(events[0][1].firstBuyer, true); assert.equal(events[0][1].amountUsd, 2.99);
});
test('an unknown product fails without marking a user paid or consuming the event', async () => {
  const database = db();
  await assert.rejects(applyRevenueCatEvent(database,event({ product_id: 'unknown' })), /Invalid billing product/);
  assert.equal(database.data.get('users/buyer').has_purchased, false);
  assert.equal([...database.data.keys()].filter(k=>k.startsWith('revenuecat_events/')).length, 0);
});
test('renewals preserve topups and old expirations cannot remove a renewed allowance', async () => {
  const database = db(), now = Date.now();
  await applyRevenueCatEvent(database,event({ type:'RENEWAL', product_id:'aura_monthly', event_timestamp_ms:now, expiration_at_ms:now+86400000, purchased_at_ms:now, price:9.99 }));
  await applyRevenueCatEvent(database,event({ id:'old-expiry',type:'EXPIRATION',product_id:'aura_monthly',event_timestamp_ms:now-1000 }));
  assert.equal(database.data.get('credits/buyer').subscription_credits, 100);
  assert.equal(database.data.get('credits/buyer').topup_credits, 2);
});
test('webhook is fail-closed and asks RevenueCat to retry a failed grant', async () => {
  const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
  const api = loadTs('apps/web/app/api/webhooks/revenuecat/route.ts', { 'next/server': next, '@/lib/firebase/admin': { adminDb: {} }, '@/lib/revenuecat-events': { applyRevenueCatEvent: async () => { throw Error('offline'); } } });
  const request = authorization => new Request('http://localhost', { method:'POST', headers:{authorization}, body:JSON.stringify({event:event()}) });
  delete process.env.REVENUECAT_WEBHOOK_SECRET;
  assert.equal((await api.POST(request('secret'))).status,503);
  process.env.REVENUECAT_WEBHOOK_SECRET='test-secret';
  assert.equal((await api.POST(request('wrong'))).status,401);
  assert.equal((await api.POST(request('test-secret'))).status,500);
});
test('annual credits reset by calendar month, including month-end clamping', () => {
  const { creditCycleStart } = loadTs('apps/web/lib/credit-cycle.ts');
  const start='2026-01-31T12:00:00Z',end='2027-01-31T12:00:00Z';
  assert.equal(creditCycleStart(start,end,Date.parse('2026-02-28T12:00:00Z')),Date.parse('2026-02-28T12:00:00Z'));
  assert.equal(creditCycleStart(start,end,Date.parse('2026-03-31T12:00:00Z')),Date.parse('2026-03-31T12:00:00Z'));
  assert.equal(creditCycleStart(start,end,Date.parse(end)),null);
});
test('credit deductions for existing app features cannot race a tool unlock', async () => {
  const database = db();
  database.data.get('credits/buyer').topup_credits = 5;
  const { deductCredits } = loadTs('apps/web/lib/firebase/credits.ts', { './admin': {adminDb:database}, 'firebase-admin/firestore': {} });
  const results = await Promise.all([deductCredits('buyer',3,'a','test'),deductCredits('buyer',3,'b','test')]);
  assert.equal(results.filter(r=>r.success).length,1);
  assert.equal(database.data.get('credits/buyer').topup_credits,2);
});
