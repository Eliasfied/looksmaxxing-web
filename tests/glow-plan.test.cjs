const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTs } = require('./helpers/load-ts.cjs');
const { FakeFirestore } = require('./helpers/fake-firestore.cjs');

const { applyRevenueCatEvent } = loadTs('apps/web/lib/revenuecat-events.ts');
const { combinePlan } = loadTs('apps/web/lib/entitlement.ts', { './firebase/admin': { adminDb: {} } });
const glow = loadTs('apps/web/lib/glow-plan.ts');
const { safeToolReturn } = loadTs('apps/web/lib/tool-report.ts');

const DAY = 86_400_000;
const purchase = (extra = {}) => ({
  id: 'glow-event-1', type: 'NON_RENEWING_PURCHASE', app_user_id: 'buyer', product_id: 'aura_glow_30',
  price: 14.99, currency: 'USD', environment: 'PRODUCTION', event_timestamp_ms: Date.now(),
  purchased_at_ms: Date.now(), transaction_id: 'glow-tx-1', store: 'RC_BILLING', ...extra
});
const db = () => new FakeFirestore({
  'users/buyer': { has_purchased: false },
  'credits/buyer': { subscription_credits: 0, topup_credits: 0 },
  'credit_packs/glow_30': { revenuecat_product_id: 'aura_glow_30', credits: 30, glow_plan_days: 40, name: '30-Day Glow-Up Plan' }
});

test('buying the plan unlocks 40 days of access and adds the try-on credits once', async () => {
  const database = db(), event = purchase();
  await Promise.all([applyRevenueCatEvent(database, event), applyRevenueCatEvent(database, event)]);
  const doc = database.data.get('glow_plans/buyer');
  assert.equal(Date.parse(doc.access_until) - event.purchased_at_ms, 40 * DAY);
  assert.equal(database.data.get('credits/buyer').topup_credits, 30);
  assert.equal(database.data.get('subscriptions/buyer'), undefined);
});

test('buying the plan again extends from the current end, not from today', async () => {
  const database = db(), now = Date.now();
  await applyRevenueCatEvent(database, purchase({ purchased_at_ms: now }));
  await applyRevenueCatEvent(database, purchase({ id: 'glow-event-2', transaction_id: 'glow-tx-2', purchased_at_ms: now + DAY }));
  assert.equal(Date.parse(database.data.get('glow_plans/buyer').access_until) - now, 80 * DAY);
});

test('plan access unlocks Pro without counting as a subscription, and ends on time', () => {
  const now = Date.now();
  const active = combinePlan(undefined, { access_until: new Date(now + DAY).toISOString() }, now);
  assert.equal(active.pro, true);
  assert.equal(active.subscribed, false);
  const ended = combinePlan(undefined, { access_until: new Date(now - 1).toISOString() }, now);
  assert.equal(ended.pro, false);
  assert.equal(ended.glow.active, false);
  assert.equal(combinePlan(undefined, undefined, now).glow, null);
});

const rawPlan = () => ({
  headline: 'Sharper, fresher, rested',
  summary: 'Skin first.',
  focus: [{ area: 'skin', title: 'Calm skin', finding: 'Skin clarity 58/100', goal: 'Fewer breakouts' }, { area: 'bogus', title: 'Unknown area' }],
  morning: [{ step: 'Cleanser', detail: 'Gentle' }, { step: 'SPF 50', detail: '' }],
  evening: [{ step: 'Cleanser', detail: '' }],
  habits: [{ area: 'nutrition', text: '2 l water' }, { area: 'face', text: 'Posture check' }, { area: 'training', text: '8,000 steps' }],
  workouts: [{ title: 'Workout A', detail: 'Squats' }, { title: 'Workout B', detail: 'Push-ups' }],
  trainingDays: 3,
  days: Array.from({ length: 28 }, (_, i) => ({ day: i + 1, title: `D${i + 1}`, tasks: [{ area: 'hair', text: `Task ${i + 1}` }] })),
  products: [{ area: 'skin', type: 'Sunscreen', lookFor: 'SPF 50', why: 'UV', budget: '$10' }],
  looks: { hair: ['textured-crop', 'Curtains (suits Oval)', 'not-a-real-cut'], beard: 'Light Stubble', glasses: 'nope', color: null },
  expectations: [{ when: 'Week 1', text: 'Less shine' }],
  limits: ['Bone structure stays.']
});

test('the model plan is cleaned: 30 days, known areas, catalog looks only', () => {
  const plan = glow.sanitizePlan(rawPlan());
  assert.equal(plan.days.length, 30);
  assert.deepEqual(plan.days[29].tasks, []);
  assert.equal(plan.focus[1].area, 'style');
  assert.deepEqual(plan.looks.hair, ['textured-crop', 'curtains']);
  assert.equal(plan.looks.beard, 'light-stubble');
  assert.equal(plan.looks.glasses, null);
  assert.deepEqual(plan.habits.map((h) => h.id), ['h0', 'h1', 'h2']);
});

test('an incomplete model plan is rejected instead of saved', () => {
  assert.throws(() => glow.sanitizePlan({ ...rawPlan(), habits: [] }), /incomplete/);
  assert.throws(() => glow.sanitizePlan({ ...rawPlan(), days: [] }), /incomplete/);
});

test('every day has both routines and the habits, milestones land on fixed days', () => {
  const plan = glow.sanitizePlan(rawPlan());
  const day1 = glow.checklistForDay(plan, 1).map((i) => i.key);
  assert.deepEqual(day1, ['1-m', '1-am', '1-t0', '1-w', '1-h0', '1-h1', '1-h2', '1-pm']);
  assert.ok(glow.checklistForDay(plan, 30).some((i) => i.key === '30-m' && /Re-scan/.test(i.text)));
  assert.equal(glow.checklistForDay(plan, 2).some((i) => i.key === '2-w'), false);
  assert.equal(glow.workoutForDay(plan, 1).title, 'Workout A');
  assert.equal(glow.workoutForDay(plan, 3).title, 'Workout B');
  assert.equal(glow.isChecklistKey(plan, '3-w'), true);
  assert.equal(glow.isChecklistKey(plan, '2-w'), false);
  assert.equal(glow.isChecklistKey(plan, '31-am'), false);
  assert.equal(glow.isChecklistKey(plan, 'done.1-am'), false);
});

test('plan day follows the calendar and stays within 1..30', () => {
  const start = new Date(2026, 10, 1, 23, 50).toISOString();
  assert.equal(glow.planDay(start, new Date(2026, 10, 1, 23, 59)), 1);
  assert.equal(glow.planDay(start, new Date(2026, 10, 2, 0, 5)), 2);
  assert.equal(glow.planDay(start, new Date(2027, 0, 1)), 30);
  assert.equal(glow.planDay(start, new Date(2026, 9, 1)), 1);
});

test('intake accepts only known answers', () => {
  const valid = { audience: 'women', age: '25-34', goals: ['skin', 'hair', 'nope'], skinType: 'dry', skinConcerns: ['acne', 'x'], hairType: 'wavy', hairConcerns: [], body: 'average', training: 'home', diet: 'vegan', sleep: '6-7', minutes: '20', budget: 'low', note: '  wedding   soon ' };
  const intake = glow.parseIntake(valid);
  assert.deepEqual(intake.goals, ['skin', 'hair']);
  assert.deepEqual(intake.skinConcerns, ['acne']);
  assert.equal(intake.facialHair, 'none');
  assert.equal(intake.note, 'wedding soon');
  assert.throws(() => glow.parseIntake({ ...valid, goals: [] }), /goal/);
  assert.throws(() => glow.parseIntake({ ...valid, budget: 'unlimited' }), /budget/);
});

test('the plan page is a safe place to return to after sign-up', () => {
  assert.equal(safeToolReturn('/glow-up'), '/glow-up');
  assert.equal(safeToolReturn('/glow-up/../evil'), null);
});
