import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
