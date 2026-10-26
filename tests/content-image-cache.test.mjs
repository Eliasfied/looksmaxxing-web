import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readReviewedImage, saveReviewedImage } from '../scripts/content-image-cache.mjs';

test('image recovery only reuses approved, unchanged files with the same brief', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-image-cache-'));
  const file = path.join(dir, 'image.webp'), manifest = path.join(dir, 'review.json');
  const brief = { prompt: 'Angular eyeglasses', purpose: 'Show frame shapes' };
  const review = { pass: true, issues: [], alt: 'Angular eyeglasses' };
  try {
    assert.equal(readReviewedImage(file, manifest, brief), null);
    assert.throws(() => saveReviewedImage(file, manifest, brief, Buffer.from('bytes'), { pass: false, issues: ['wrong subject'] }));
    saveReviewedImage(file, manifest, brief, Buffer.from('approved image bytes'), review);
    assert.deepEqual(readReviewedImage(file, manifest, brief), review);
    assert.equal(readReviewedImage(file, manifest, { ...brief, purpose: 'Different section' }), null);
    fs.writeFileSync(file, 'replaced image');
    assert.equal(readReviewedImage(file, manifest, brief), null);
  } finally {
    for (const target of [file, manifest]) if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.rmdirSync(dir);
  }
});

test('a version 1 record keeps its approved image instead of regenerating it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-image-cache-v1-'));
  const file = path.join(dir, 'image.webp'), manifest = path.join(dir, 'review.json');
  const brief = { prompt: 'Angular eyeglasses', purpose: 'Show frame shapes' };
  const review = { pass: true, issues: [], alt: 'Angular eyeglasses' };
  const bytes = Buffer.from('approved image bytes');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  try {
    // Written before the fingerprint stopped covering the generation prompt.
    fs.writeFileSync(file, bytes);
    fs.writeFileSync(manifest, JSON.stringify({ fingerprint: 'computed-under-the-old-scheme', sha256, reviewedAt: '2026-10-01T00:00:00.000Z', review }));
    assert.deepEqual(readReviewedImage(file, manifest, brief), review, 'legacy record should be honoured');

    // It is still bound to the file, and still requires a passing verdict.
    fs.writeFileSync(file, 'replaced image');
    assert.equal(readReviewedImage(file, manifest, brief), null);
    fs.writeFileSync(file, bytes);
    fs.writeFileSync(manifest, JSON.stringify({ fingerprint: 'old', sha256, review: { pass: false, issues: ['wrong'], alt: 'x' } }));
    assert.equal(readReviewedImage(file, manifest, brief), null);

    // Rewriting upgrades it, and from then on the brief is checked again.
    saveReviewedImage(file, manifest, brief, bytes, review);
    assert.equal(JSON.parse(fs.readFileSync(manifest, 'utf8')).version, 2);
    assert.equal(readReviewedImage(file, manifest, { ...brief, prompt: 'Something else entirely' }), null);
  } finally {
    for (const target of [file, manifest]) if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.rmdirSync(dir);
  }
});
