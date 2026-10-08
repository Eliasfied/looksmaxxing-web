import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runContentJob, recordContentJob } from '../scripts/content-job.mjs';

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
  });
  assert.deepEqual(states, [false, true]);
  assert.equal(result.status, 'review');
  assert.equal(result.outPath, '/draft.md');
  assert.ok(result.data._review.issues.includes('Image failed editorial review'));
});

test('a draft save error is recorded and does not abort subsequent topics', async () => {
  const failed = await runContentJob({}, async () => ({ _draft: false }), async () => { throw Error('Disk error'); });
  assert.equal(failed.status, 'review');
  assert.equal(failed.errors.length, 2);
  const successful = await runContentJob({}, async () => ({ _draft: false }), async () => '/article.md');
  assert.equal(successful.status, 'generated');
});
