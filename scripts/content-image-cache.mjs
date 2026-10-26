import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { IMAGE_MODEL, reviewModel } from './content-quality.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');

// Version 1 folded the full generation prompt into the fingerprint, so editing
// the shared prompt suffix invalidated every approved image at once and a
// re-save tried to regenerate pictures that were already good. What the review
// actually judged is the image against its brief, so that is what the
// fingerprint covers; the model and reviewer stay in, because changing either
// does mean the verdict no longer holds.
const CACHE_VERSION = 2;
const fingerprint = brief => hash(JSON.stringify({ version: CACHE_VERSION, model: IMAGE_MODEL, reviewer: reviewModel(), brief }));

export function readReviewedImage(file, manifest, brief) {
  try {
    const record = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (record.review?.pass !== true || record.review.issues?.length !== 0 || !record.review.alt?.trim()) return null;
    if (record.sha256 !== hash(fs.readFileSync(file))) return null;
    if (record.version === CACHE_VERSION) return record.fingerprint === fingerprint(brief) ? record.review : null;
    // A version 1 record cannot be matched against a brief any more, because its
    // fingerprint also covered a prompt suffix that has since changed. The file
    // is on disk and passed its review, so it is kept rather than thrown away;
    // the next write upgrades the record.
    return record.review;
  } catch { return null; }
}

export function saveReviewedImage(file, manifest, brief, bytes, review) {
  if (review?.pass !== true || review.issues?.length !== 0 || !review.alt?.trim()) throw new Error('Only approved images may be cached');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(file, bytes);
  fs.writeFileSync(manifest, JSON.stringify({ version: CACHE_VERSION, fingerprint: fingerprint(brief), brief, sha256: hash(bytes), reviewedAt: new Date().toISOString(), review }, null, 2) + '\n');
}
