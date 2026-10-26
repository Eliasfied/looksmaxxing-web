import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, csvRow } from '../scripts/keyword-research.mjs';

test('keyword slugs are safe for the content collections', () => {
  assert.equal(slugify('Best Looksmaxxing App'), 'best-looksmaxxing-app');
  assert.equal(slugify("what's the cost of jaw surgery?"), 'whats-the-cost-of-jaw-surgery');
  assert.equal(slugify('  umax   vs  looksmax ai  '), 'umax-vs-looksmax-ai');
  // The generator refuses a slug that is not strict kebab-case.
  for (const keyword of ['Best App!', 'glow up — 30s', 'mewing (before & after)']) {
    assert.match(slugify(keyword), /^[a-z0-9]+(?:-[a-z0-9]+)*$/, keyword);
  }
});

test('an emitted row lands in the csv as a pending page with its measured volume', () => {
  const row = csvRow({ keyword: 'best looksmaxxing app', volume: 2400, sd: 31, cluster: 'app-comparison', slug: 'best-looksmaxxing-app' });
  assert.equal(row, 'best looksmaxxing app,2400,31,app-comparison,best-looksmaxxing-app,pending,blog,yes,5');
  const fields = row.split(',');
  assert.equal(fields.length, 9, 'must match the keywords.csv schema');
  assert.equal(fields[5], 'pending');
  // A missing difficulty stays blank rather than becoming a number nobody measured.
  assert.equal(csvRow({ keyword: 'k', volume: 10, cluster: 'c', slug: 's' }).split(',')[2], '');
});
