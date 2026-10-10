import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runContentJob, recordContentJob, isDraftContent } from '../scripts/content-job.mjs';
const approve = async (_page, data) => { data._draft = false; data._review = { pass: true, issues: [] }; };

test('a checkpoint write failure after approval still restores excluded Markdown', async () => {
  const states = [];
  let checkpointCalls = 0;
  const result = await runContentJob({}, async () => ({}), async (_page, data) => {
    states.push(data._draft); return '/article.md';
  }, approve, async () => { if (++checkpointCalls > 1) throw Error('Checkpoint disk unavailable'); });
  assert.deepEqual(states, [true, false, true]);
  assert.equal(result.status, 'review');
  assert.equal(result.data._draft, true);
});

test('only an explicit draft flag in frontmatter permits retry or exclusion', () => {
  assert.equal(isDraftContent('---\r\ntitle: "Draft"\r\ndraft: true\r\n---\r\nBody'), true);
  assert.equal(isDraftContent('---\ntitle: "Published"\n---\nBody\ndraft: true'), false);
  assert.equal(isDraftContent('---\ndraft: false\n---\n'), false);
});

test('the draft and original JSON are saved before a truncated review', async () => {
  const calls = [];
  const original = { body_markdown: '{{IMAGE_2}}', image_prompts: [{ prompt: 'specific visual' }], _research: { sources: [{ evidence: 'original evidence' }] } };
  const result = await runContentJob({}, async () => original, async (_page, data) => {
    calls.push('markdown'); assert.equal(data._draft, true); return '/draft.md';
  }, async () => { calls.push('review'); throw Error('Incomplete model response: max_tokens'); }, async (_page, data) => {
    calls.push('checkpoint'); assert.equal(data.body_markdown, '{{IMAGE_2}}'); assert.equal(data._research.sources[0].evidence, 'original evidence');
  });
  assert.deepEqual(calls.slice(0, 3), ['checkpoint', 'markdown', 'review']);
  assert.equal(result.status, 'review');
  assert.equal(result.outPath, '/draft.md');
  assert.match(result.errors[0], /max_tokens/);
});

test('a blocking editorial verdict never invokes the publishable saver', async () => {
  const states = [];
  const result = await runContentJob({}, async () => ({}), async (_page, data) => { states.push(data._draft); return '/draft.md'; }, async (_page, data) => {
    data._review = { pass: false, issues: ['Unsupported claim'] };
  });
  assert.equal(result.status, 'review');
  assert.deepEqual(states, [true]);
});

test('a failure before a draft removes the entire topic from the automatic queue', async () => {
  const result = await runContentJob({ slug: 'one' }, async () => { throw Error('Research unavailable'); }, () => assert.fail('No draft to save'));
  const rows = [{ slug: 'one', status: 'pending' }, { slug: 'one', status: 'pending' }, { slug: 'two', status: 'pending' }];
  recordContentJob(rows, 'one', result);
  assert.deepEqual(rows.map(row => row.status), ['review', 'review', 'pending']);
  assert.deepEqual(result.errors, ['Research unavailable']);
  assert.equal(result.outPath, undefined);
});

test('an image failure saves an excluded draft without trying images again', async () => {
  const states = [];
  const result = await runContentJob({}, async () => ({ _draft: false, _review: { pass: true, issues: [] } }), async (_page, data) => {
    states.push(data._draft);
    if (!data._draft) throw Error('Image failed editorial review');
    return '/draft.md';
  }, approve);
  assert.deepEqual(states, [true, false, true]);
  assert.equal(result.status, 'review');
  assert.equal(result.outPath, '/draft.md');
  assert.ok(result.data._review.issues.includes('Image failed editorial review'));
});

test('a draft save error is recorded and does not abort subsequent topics', async () => {
  const failed = await runContentJob({}, async () => ({ _draft: false }), async () => { throw Error('Disk error'); });
  assert.equal(failed.status, 'review');
  assert.equal(failed.errors.length, 2);
  const successful = await runContentJob({}, async () => ({}), async () => '/article.md', approve);
  assert.equal(successful.status, 'generated');
  const rows = [{ slug: 'retry', status: 'review' }];
  recordContentJob(rows, 'retry', successful);
  assert.equal(rows[0].status, 'generated');
});
