const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { FakeFirestore, Timestamp, FieldValue } = require('./helpers/fake-firestore.cjs');
const pure = loadTs('apps/web/lib/tool-report.ts');
const { applyRevenueCatEvent } = loadTs('apps/web/lib/revenuecat-events.ts');
const raw = () => ({ validPhoto: true, confidence: .9, potentialScore: 7.35, headline: 'Private finding', sections: [1,2,3].map(n => ({ title: 'Section ' + n, text: 'PAID_DETAIL_' + n, tasks: ['A small action'] })), limitations: 'Photo-dependent estimate', unexpected: 'do not expose' });
const report = () => pure.parseToolReport(raw());
test('strict model parsing and unpaid preview never include private fields', () => {
  assert.equal(report().potentialScore, 7.4);
  assert.deepEqual(Object.keys(pure.previewReport('id', 'ai-face-rating', report())).sort(), ['id','potentialScore','tool','unlocked']);
  assert.ok(!JSON.stringify(pure.previewReport('id','tool',report())).includes('PAID_DETAIL'));
  for (const edit of [{ confidence: NaN }, { validPhoto: false }, { potentialScore: 11 }, { sections: [] }, { confidence: .2 }]) assert.throws(() => pure.parseToolReport({ ...raw(), ...edit }));
  assert.ok(!Object.hasOwn(report(), 'unexpected'));
});
test('only local report return paths are allowed', () => {
  const good = '/tools/result/' + 'a'.repeat(40) + '?checkout=1';
  assert.equal(pure.safeToolReturn(good), good);
  for (const path of ['https://evil.test', '//evil.test', '/tools/result/' + 'a'.repeat(40) + '?next=https://evil.test', '/dashboard', '/tools/result/../login']) assert.equal(pure.safeToolReturn(path), null);
});
function fixture() {
  process.env.TOOL_REPORT_SECRET = 'unit-test-only-not-a-real-key-1234567890';
  const db = new FakeFirestore({ 'users/buyer': { has_purchased: false }, 'credits/buyer': { subscription_credits: 0, topup_credits: 2 }, 'credit_packs/starter': { revenuecat_product_id: 'aura_starter_pack', credits: 5 } });
  const state = { user: null }, jar = new Map();
  const store = loadTs('apps/web/lib/tool-store.ts', {
    './firebase/admin': { adminDb: db },
    './firebase/server': { getSessionUser: async () => state.user },
    './firebase/credits': { getCredits: async () => {} },
    'next/headers': { cookies: async () => ({ get: key => jar.has(key) ? { value: jar.get(key) } : undefined, set: (key,value) => jar.set(key,value) }) },
    'firebase-admin/firestore': { Timestamp, FieldValue },
  });
  return { db, state, jar, store };
}
test('guest -> account -> verified purchase -> unlock is private, encrypted and idempotent', async () => {
  const { db, state, jar, store } = fixture();
  const token = await store.guestToken();
  const id = await store.saveToolReport('ai-face-rating', report(), token, '/blog/example', 'everyone');
  assert.ok(!JSON.stringify(db.data.get('private_tool_reports/' + id)).includes('PAID_DETAIL'));
  assert.equal((await store.accessReport(id)).unlocked, false);
  const savedCookie = jar.get(store.GUEST_COOKIE); jar.clear();
  assert.equal(await store.accessReport(id), null);
  jar.set(store.GUEST_COOKIE, savedCookie);
  state.user = { id: 'buyer' };
  await Promise.all([store.claimReport(id), store.claimReport(id)]);
  await assert.rejects(store.unlockToolReport(id), /PAYMENT_REQUIRED/);
  await applyRevenueCatEvent(db, { id: 'paid-starter', type: 'NON_RENEWING_PURCHASE', app_user_id: 'buyer', product_id: 'aura_starter_pack', price: 2.99, environment: 'PRODUCTION', event_timestamp_ms: Date.now(), transaction_id: 'purchase-1', store: 'RC_BILLING' });
  assert.equal(db.data.get('credits/buyer').topup_credits, 7);
  await Promise.all([store.unlockToolReport(id), store.unlockToolReport(id)]);
  assert.equal(db.data.get('credits/buyer').topup_credits, 2);
  assert.equal((await store.accessReport(id)).unlocked, true);
  assert.equal((await store.listToolReports('buyer'))[0].unlocked, true);
  assert.equal([...db.data].filter(([k, v]) => k.startsWith('credit_transactions/') && v.type === 'tool_report_unlock').length, 1);
  const second = await store.saveToolReport('face-analysis-for-women', report(), token, '/tools', 'women');
  await assert.rejects(store.unlockToolReport(second), /PAYMENT_REQUIRED/);
  assert.equal(db.data.get('credits/buyer').topup_credits, 2);
  state.user = { id: 'someone-else' };
  assert.equal(await store.accessReport(id), null);
});
test('expired and tampered reports cannot be opened; forged unlock cannot expose content', async () => {
  const { db, state, store } = fixture();
  const token = await store.guestToken();
  const id = await store.saveToolReport('ai-face-rating', report(), token, '/tools', 'everyone');
  const doc = db.data.get('private_tool_reports/' + id);
  doc.unlockProof = true; state.user = { id: 'buyer' }; await store.claimReport(id);
  assert.equal((await store.accessReport(id)).unlocked, false);
  db.data.get('private_tool_reports/' + id).sealed = 'tampered';
  assert.equal(await store.accessReport(id), null);
  const expired = await store.saveToolReport('ai-face-rating', report(), token, '/tools', 'everyone');
  db.data.get('private_tool_reports/' + expired).expiresAt = Timestamp.fromMillis(Date.now() - 1);
  assert.equal(await store.accessReport(expired), null);
});
test('quota reservations are transactional and reject the fourth guest request', async () => {
  const { store } = fixture(), token = await store.guestToken();
  const request = new Request('http://localhost/api/tools/analyze', { headers: { 'x-forwarded-for': 'test-ip' } });
  const results = await Promise.allSettled([1,2,3,4].map(() => store.reservePreview(request,token)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  assert.equal(store.sameOrigin(new Request('https://app.aura-looksmaxxing.com/api', { headers: { origin: 'https://evil.test' } })), false);
});
test('an encrypted report cannot be swapped into another report ID', async () => {
  const { db, store } = fixture(), token = await store.guestToken();
  const one = await store.saveToolReport('ai-face-rating', report(), token, '/tools', 'everyone');
  const two = await store.saveToolReport('ai-face-rating', report(), token, '/tools', 'everyone');
  db.data.get('private_tool_reports/' + one).sealed = db.data.get('private_tool_reports/' + two).sealed;
  assert.equal(await store.accessReport(one), null);
});
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } };
test('anonymous analyze API emits only the preview and validates input before spending', async () => {
  let calls = 0;
  const api = loadTs('apps/web/app/api/tools/analyze/route.ts', {
    'next/server': next, '@/lib/tool-report': pure,
    '@/lib/tool-analysis': { analyzeTool: async () => { calls++; return report(); } },
    '@/lib/tool-store': { sameOrigin: req => req.headers.get('origin') === 'http://localhost', guestToken: async () => 'guest', reservePreview: async () => {}, saveToolReport: async () => 'a'.repeat(40) },
  });
  const request = body => new Request('http://localhost/api/tools/analyze', { method: 'POST', headers: { origin: 'http://localhost' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const valid = { tool: 'ai-face-rating', image: 'data:image/jpeg;base64,YWJj', consent: true, adult: true };
  const response = await api.POST(request(valid));
  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(await response.json()).sort(), ['id','potentialScore','tool','unlocked']);
  assert.equal((await api.POST(request({ ...valid, tool: 'mewing-tracker' }))).status, 400);
  assert.equal((await api.POST(request({ ...valid, consent: false }))).status, 400);
  assert.equal((await api.POST(request('null'))).status, 400);
  assert.equal((await api.POST(request('{broken'))).status, 400);
  assert.equal(calls, 1);
});
test('report GET serializes paid content only after server-side unlock', async () => {
  let unlocked = false;
  const api = loadTs('apps/web/app/api/tools/reports/[id]/route.ts', {
    'next/server': next, '@/lib/tool-report': pure,
    '@/lib/tool-store': { accessReport: async () => ({ unlocked, payload: { tool: 'ai-face-rating', report: report() } }) },
  });
  const context = { params: Promise.resolve({ id: 'a'.repeat(40) }) };
  assert.ok(!(await (await api.GET(new Request('http://localhost'), context)).text()).includes('PAID_DETAIL'));
  unlocked = true;
  assert.ok((await (await api.GET(new Request('http://localhost'), context)).text()).includes('PAID_DETAIL'));
});
