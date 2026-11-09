const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');

const { safeToolReturn, withCheckout } = loadTs('apps/web/lib/tool-report.ts');
const { dayOneTasks, lockedDays } = loadTs('apps/web/lib/glow-day-one.ts');
const { analyticsForRevenueCatEvent } = loadTs('apps/web/lib/revenuecat-events.ts');

test('the way back from sign-up can ask for the checkout, and nothing else', () => {
  for (const path of ['/tools/ai-face-rating?resume=1&checkout=1', '/glow-up?checkout=1', '/glow-up', '/tools/ai-face-rating?resume=1'])
    assert.equal(safeToolReturn(path), path);
  for (const path of [
    '/glow-up?checkout=1&next=//evil.test',
    '/glow-up?checkout=2',
    '/tools/x?resume=1&checkout=1&next=//evil.test',
    '/tools/x?checkout=1',
    '/glow-up/../evil?checkout=1'
  ])
    assert.equal(safeToolReturn(path), null);
});

test('withCheckout marks a return path once, and the result is still allowed', () => {
  assert.equal(withCheckout('/tools/psl-score-calculator?resume=1'), '/tools/psl-score-calculator?resume=1&checkout=1');
  assert.equal(withCheckout('/glow-up'), '/glow-up?checkout=1');
  const result = '/tools/result/' + 'a'.repeat(40) + '?checkout=1';
  assert.equal(withCheckout(result), result);
  for (const path of ['/tools/psl-score-calculator?resume=1', '/glow-up', result]) assert.equal(safeToolReturn(withCheckout(path)), withCheckout(path));
});

test('day 1 has three concrete tasks for every face shape, for him and for her', () => {
  for (const shape of ['Oval', 'Round', 'Square', 'Oblong', 'Heart', 'Diamond'])
    for (const audience of ['men', 'women']) {
      const tasks = dayOneTasks({ shape, tilt: 'neutral', spacing: 'balanced' }, audience);
      assert.deepEqual(tasks.map((t) => t.id), ['hair', 'brows', 'skin']);
      for (const t of tasks) assert.ok(t.title.length > 5 && t.detail.length > 30, `${shape}/${audience}/${t.id}`);
      assert.match(tasks[0].title, audience === 'women' ? /salon/ : /barber/);
    }
  const down = dayOneTasks({ shape: 'Oval', tilt: 'negative', spacing: 'balanced' }, 'men')[1].detail;
  assert.match(down, /tail of the brow/);
  const close = dayOneTasks({ shape: 'Oval', tilt: 'neutral', spacing: 'close-set' }, 'women')[1].detail;
  assert.match(close, /inner ends/);
  assert.equal(lockedDays('women').length, 4);
  assert.doesNotMatch(lockedDays('women')[1][1], /beard/);
});

const rc = (extra = {}) => ({
  id: 'event-1',
  type: 'NON_RENEWING_PURCHASE',
  app_user_id: 'buyer',
  product_id: 'aura_glow_30',
  price: 14.99,
  price_in_purchased_currency: 14.99,
  currency: 'USD',
  environment: 'PRODUCTION',
  store: 'RC_BILLING',
  transaction_id: 'tx-1',
  event_timestamp_ms: Date.UTC(2026, 10, 9, 12),
  ...extra
});

test('a verified sale becomes one analytics event per transaction', () => {
  const sale = analyticsForRevenueCatEvent(rc());
  assert.equal(sale.event, 'purchase_verified');
  assert.equal(sale.properties.offer, 'glow_plan');
  assert.equal(sale.properties.revenue, 14.99);
  assert.equal(sale.properties.renewal, false);
  assert.equal(sale.options.timestamp, '2026-11-09T12:00:00.000Z');
  assert.match(sale.options.uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  // RevenueCat may redeliver the same payment under a new event id.
  assert.equal(analyticsForRevenueCatEvent(rc({ id: 'event-2' })).options.uuid, sale.options.uuid);
  assert.notEqual(analyticsForRevenueCatEvent(rc({ transaction_id: 'tx-2' })).options.uuid, sale.options.uuid);
  const renewal = analyticsForRevenueCatEvent(rc({ type: 'RENEWAL', product_id: 'aura_monthly', price: 9.99 }));
  assert.equal(renewal.properties.offer, 'pro');
  assert.equal(renewal.properties.renewal, true);
});

test('cancellations are reported, other lifecycle noise is not', () => {
  assert.equal(analyticsForRevenueCatEvent(rc({ type: 'CANCELLATION', product_id: 'aura_monthly', cancel_reason: 'UNSUBSCRIBE' })).event, 'subscription_cancelled');
  assert.equal(analyticsForRevenueCatEvent(rc({ type: 'EXPIRATION', product_id: 'aura_monthly' })).event, 'subscription_expired');
  assert.equal(analyticsForRevenueCatEvent(rc({ type: 'UNCANCELLATION' })), null);
  assert.equal(analyticsForRevenueCatEvent(rc({ type: 'TRANSFER' })), null);
});

function webhook(apply, captured) {
  const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
  return loadTs('apps/web/app/api/webhooks/revenuecat/route.ts', {
    'next/server': next,
    '@/lib/firebase/admin': { adminDb: {} },
    '@/lib/revenuecat-events': { applyRevenueCatEvent: apply, analyticsForRevenueCatEvent },
    '@/lib/posthog-server': { captureServerEvent: async (...args) => { captured.push(args); return true; } }
  });
}
const request = (body) =>
  new Request('http://localhost', { method: 'POST', headers: { authorization: 'test-secret' }, body: JSON.stringify({ event: body }) });

test('the webhook reports a booked sale to analytics, and only a booked one', async () => {
  process.env.REVENUECAT_WEBHOOK_SECRET = 'test-secret';
  const captured = [];
  assert.equal((await webhook(async () => ({ ok: true }), captured).POST(request(rc()))).status, 200);
  assert.equal(captured.length, 1);
  assert.equal(captured[0][0], 'buyer');
  assert.equal(captured[0][1], 'purchase_verified');

  const none = [];
  await webhook(async () => ({ duplicate: true }), none).POST(request(rc()));
  assert.equal(none.length, 0);
  const failed = [];
  assert.equal((await webhook(async () => { throw Error('offline'); }, failed).POST(request(rc()))).status, 500);
  assert.equal(failed.length, 0);
});
