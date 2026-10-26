import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewWithRepair, imageWithRepair, ImageRejected } from '../scripts/content-repair.mjs';
import { runContentJob } from '../scripts/content-job.mjs';

for (const pass of [true, false]) test('article correction rechecked; final pass=' + pass, async () => {
  const data = { title: 'Original', _research: { sources: [] } };
  let reviews = 0, repairs = 0;
  const verdict = await reviewWithRepair(data, async () => ({ pass: ++reviews > 1 && pass, issues: ['claim'] }), async () => { repairs++; return { title: 'Corrected', _research: 'injected' }; }, async () => {});
  assert.equal(verdict.pass, pass); assert.equal(reviews, 2); assert.equal(repairs, 1);
  assert.equal(data.title, 'Corrected'); assert.equal(data._textRepair.original.title, 'Original');
  assert.deepEqual(data._research, { sources: [] });
  await reviewWithRepair(data, async () => ({ pass: false, issues: ['claim'] }), async () => { repairs++; }, async () => {});
  assert.equal(repairs, 1);
});

test('clinical gating, successful review and technical failure never call repair', async () => {
  for (const kind of ['clinical', 'passed', 'technical']) {
    let repairs = 0;
    const run = () => reviewWithRepair({}, async () => { if (kind === 'technical') throw Error('API'); return { pass: kind === 'passed', issues: [] }; }, async () => { repairs++; }, async () => {}, kind !== 'clinical');
    if (kind === 'technical') await assert.rejects(run, /API/); else await run();
    assert.equal(repairs, 0);
  }
});

for (const pass of [true, false]) test('image regenerated with feedback; final pass=' + pass, async () => {
  const state = { attempts: [] }; let generated = 0, inspected = 0;
  const run = () => imageWithRepair({ prompt: 'A haircut' }, state, async () => {}, async prompt => { generated++; if (generated === 2) assert.match(prompt, /wrong anatomy/); return Buffer.from('image'); }, async () => { inspected++; if (inspected === 1 || !pass) throw new ImageRejected(['wrong anatomy']); return { pass: true, issues: [], alt: 'Hair' }; });
  if (pass) {
    assert.equal((await run()).review.pass, true);
    assert.equal(generated, 2); assert.equal(inspected, 2);
    // A finished attempt list is complete, not exhausted; nothing may resume it.
    await assert.rejects(run, /interrupted/); assert.equal(generated, 2);
  } else {
    await assert.rejects(run, /failed editorial review/);
    assert.equal(generated, 3); assert.equal(inspected, 3);
    await assert.rejects(run, /budget exhausted/); assert.equal(generated, 3);
  }
});

test('the last image attempt drops an undrawable brief and is judged on the reduced one', async () => {
  const brief = { prompt: 'Seven face outlines with a one-word label beneath each', purpose: 'show that face shape guides oversimplify', alt: 'Face shapes' };
  const prompts = [], judged = [];
  const state = { attempts: [] };
  await assert.rejects(() => imageWithRepair(brief, state, async () => {},
    async prompt => { prompts.push(prompt); return Buffer.from('image'); },
    async (_, used) => { judged.push(used.prompt); throw new ImageRejected(['still wrong']); },
  ), /failed editorial review/);

  assert.equal(prompts.length, 3);
  // First two attempts keep the original brief, the third abandons it.
  assert.match(prompts[0], /Seven face outlines/);
  assert.match(prompts[1], /Seven face outlines/);
  assert.doesNotMatch(prompts[2], /Seven face outlines/);
  assert.match(prompts[2], /oversimplify/);
  assert.match(prompts[2], /No text, letters, numbers or labels/);
  // The reduced image must be reviewed against the reduced brief, or the brief
  // it was told to abandon would reject it every time.
  assert.deepEqual(judged.slice(0, 2), [brief.prompt, brief.prompt]);
  assert.doesNotMatch(judged[2], /Seven face outlines/);
  assert.equal(state.attempts.at(-1).reduced, true);
});

test('interrupted image attempts fail closed across restart', async () => {
  const state = { attempts: [] }; let generated = 0;
  const run = () => imageWithRepair({ prompt: 'Hair' }, state, async () => {}, async () => { generated++; throw Error('network'); }, async () => {});
  await assert.rejects(run, /network/); await assert.rejects(run, /interrupted/); assert.equal(generated, 1);
});

test('failed text correction stays draft and cannot consume another repair on restart', async () => {
  const data = { title: 'Original' }; let repairs = 0;
  const review = async (_, draft) => {
    const verdict = await reviewWithRepair(draft, async () => ({ pass: false, issues: ['unsupported'] }), async () => { repairs++; throw Error('truncated'); }, async () => {});
    draft._review = verdict; draft._draft = !verdict.pass;
  };
  const save = async () => 'draft.md';
  const first = await runContentJob({}, async () => data, save, review);
  assert.equal(first.status, 'review'); assert.equal(data._draft, true);
  const second = await runContentJob({}, async () => data, save, review);
  assert.equal(second.status, 'review'); assert.equal(repairs, 1);
});

test('second image rejection keeps the complete article unpublished', async () => {
  const saves = [];
  const result = await runContentJob({}, async () => ({}), async (_, data) => {
    saves.push(data._draft);
    if (!data._draft) await imageWithRepair({ prompt: 'Hair' }, { attempts: [] }, async () => {}, async () => Buffer.from('x'), async () => { throw new ImageRejected(['wrong']); });
    return 'draft.md';
  }, async (_, data) => { data._draft = false; data._review = { pass: true, issues: [] }; });
  assert.equal(result.status, 'review'); assert.equal(result.data._draft, true); assert.deepEqual(saves, [true, false, true]);
});
