import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { IMAGE_MODEL, imageInput, reviewModel } from './content-quality.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const fingerprint = brief => hash(JSON.stringify({ model: IMAGE_MODEL, input: imageInput(brief.prompt), reviewer: reviewModel(), brief }));

export function readReviewedImage(file, manifest, brief) {
  try {
    const record = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (record.fingerprint !== fingerprint(brief) || record.sha256 !== hash(fs.readFileSync(file))) return null;
    if (record.review?.pass !== true || record.review.issues?.length !== 0 || !record.review.alt?.trim()) return null;
    return record.review;
  } catch { return null; }
}

export function saveReviewedImage(file, manifest, brief, bytes, review) {
  if (review?.pass !== true || review.issues?.length !== 0 || !review.alt?.trim()) throw new Error('Only approved images may be cached');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(manifest, JSON.stringify({ fingerprint: fingerprint(brief), sha256: hash(bytes), reviewedAt: new Date().toISOString(), review }, null, 2) + '\n');
}
