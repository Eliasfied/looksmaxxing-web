#!/usr/bin/env node
/**
 * backfill-images.mjs
 *
 * Regenerates illustrations that an article was published without. Two paths
 * leave a post imageless: a picture that fails the visual review is dropped so
 * it cannot hold back reviewed prose, and a stored draft released later never
 * pays for inference. Both record the gap and expect a backfill; this is it.
 *
 * Usage:
 *   node scripts/backfill-images.mjs                 Report what is missing
 *   node scripts/backfill-images.mjs --apply         Generate and patch
 *   node scripts/backfill-images.mjs --apply --slug canthal-tilt-female
 *   node scripts/backfill-images.mjs --apply --hero-only
 *
 * Env vars (root .env.local): ANTHROPIC_API_KEY, FAL_API_KEY
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  generateReviewedImage, CONTENT_DIRS, DRAFT_DIR, PUBLIC_BASE, ROOT
} from './generate-content.mjs';
import { saveReviewedImage } from './content-image-cache.mjs';

const args = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const APPLY = args.includes('--apply');
/**
 * Replacement briefs for illustrations the review keeps refusing. A rejected
 * brief has usually asked for something the image model cannot do at all — a
 * multi-panel comparison, or hands at work — so retrying it only replays the
 * refusal. An override replaces the brief outright rather than appending
 * corrections to it, which also gives the attempt journal a fresh key.
 */
const OVERRIDES = (() => {
  const file = path.join(process.cwd(), 'content-reviews', 'image-prompt-overrides.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
})();
const HERO_ONLY = args.includes('--hero-only');
const ONLY_SLUG = getArg('--slug');

const read = file => fs.readFileSync(file, 'utf8');

/** Split an article into its frontmatter block and its body. */
function splitArticle(markdown, label = 'article') {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${label} has no frontmatter block`);
  return { frontmatter: match[1], body: match[2] };
}

/**
 * Where image N belonged. The published Markdown has its {{IMAGE_N}} removed,
 * so the draft supplies the anchor: the last non-empty line before the
 * placeholder, which is matched verbatim in the published body.
 */
function anchorForImage(draftBody, num) {
  const lines = draftBody.split('\n');
  const at = lines.findIndex(line => line.includes(`{{IMAGE_${num}}}`));
  if (at < 0) return null;
  for (let i = at - 1; i >= 0; i--) if (lines[i].trim()) return lines[i];
  return null;
}

function missingImages(slug, prompts) {
  const missing = [];
  for (let i = 0; i < prompts.length; i++) {
    const num = i + 1;
    if (HERO_ONLY && num !== 1) continue;
    if (!fs.existsSync(path.join(PUBLIC_BASE, 'blog', slug, `${num}.webp`))) missing.push(num);
  }
  return missing;
}

/**
 * A rejected image has already spent its two correction attempts, so reusing
 * the same brief only replays the refusal. The reviewer's own findings become
 * part of the new brief, which also gives the attempt journal a fresh key.
 */
function briefFor(slug, num, prompt, alt) {
  const override = OVERRIDES[`${slug}:${num}`];
  if (override) return { prompt: override.prompt, alt: override.alt ?? alt, article: slug, position: num };
  const journal = path.join(ROOT, 'content-reviews', 'images', `${slug}-${num}.json.attempts.json`);
  let corrections = [];
  try {
    const state = JSON.parse(read(journal));
    corrections = (state.attempts ?? []).flatMap(a => a.issues ?? []);
  } catch { /* no earlier attempt */ }
  const guidance = corrections.length
    ? `${prompt}\n\nEDITORIAL CORRECTION (backfill): earlier attempts were rejected for: ${JSON.stringify(corrections)}. Produce a simpler, plainly accurate illustration of the same subject. Prefer one clear subject over a multi-part comparison, and avoid text labels, rulers and measurement arrows.`
    : prompt;
  return { prompt: guidance, alt, article: slug, position: num };
}

function patchFrontmatter(frontmatter, publicPath, alt) {
  if (/^heroImage:/m.test(frontmatter)) return frontmatter;
  const lines = frontmatter.split('\n');
  // Keep the generator's field order: heroImage follows cluster/pubDate.
  const after = lines.findIndex(l => /^pubDate:/.test(l));
  const at = after >= 0 ? after + 1 : lines.length;
  lines.splice(at, 0, `heroImage: ${publicPath}`, `heroImageAlt: ${JSON.stringify(alt)}`);
  return lines.join('\n');
}

async function backfillSlug(slug) {
  const draftFile = path.join(DRAFT_DIR, `${slug}.json`);
  const articleFile = path.join(CONTENT_DIRS.blog, `${slug}.md`);
  if (!fs.existsSync(draftFile)) return { slug, skipped: 'no stored draft with image prompts' };
  if (!fs.existsSync(articleFile)) return { slug, skipped: 'article not published' };

  const draft = JSON.parse(read(draftFile));
  const prompts = (draft.data?.image_prompts ?? []).slice(0, 3);
  if (!prompts.length) return { slug, skipped: 'draft has no image prompts' };

  const missing = missingImages(slug, prompts);
  if (!missing.length) return { slug, done: [], missing: [] };
  if (!APPLY) return { slug, missing, planned: true };

  const article = splitArticle(read(articleFile), slug);
  let { frontmatter, body } = article;
  const done = [], failed = [];

  for (const num of missing) {
    const { prompt, alt } = prompts[num - 1];
    const outPath = path.join(PUBLIC_BASE, 'blog', slug, `${num}.webp`);
    const manifest = path.join(ROOT, 'content-reviews', 'images', `${slug}-${num}.json`);
    const brief = briefFor(slug, num, prompt, alt);
    try {
      console.log(`   🎨 ${slug} image ${num}: ${prompt.slice(0, 70)}…`);
      const { image, review } = await generateReviewedImage(brief, manifest);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      saveReviewedImage(outPath, manifest, brief, image, review);
      const publicPath = `/blog/${slug}/${num}.webp`;
      console.log(`      ✓ ${publicPath} (${(image.length / 1024).toFixed(0)} KB)`);

      if (num === 1) {
        frontmatter = patchFrontmatter(frontmatter, publicPath, review.alt);
      } else {
        const markdown = `![${review.alt}](${publicPath})`;
        if (body.includes(publicPath)) {
          // already referenced; only the file was missing
        } else {
          const anchor = anchorForImage(draft.data?.body_markdown ?? '', num);
          if (anchor && body.includes(anchor)) {
            body = body.replace(anchor, `${anchor}\n\n${markdown}`);
          } else {
            failed.push({ num, error: 'no anchor for the inline position; image saved but not placed' });
            continue;
          }
        }
      }
      done.push(num);
    } catch (e) {
      console.warn(`      ❌ image ${num}: ${e.message}`);
      failed.push({ num, error: e.message });
    }
  }

  if (done.length) fs.writeFileSync(articleFile, `---\n${frontmatter}\n---\n${body}`);
  return { slug, done, failed, missing };
}

async function main() {
  const files = fs.readdirSync(CONTENT_DIRS.blog).filter(f => f.endsWith('.md'));
  const slugs = (ONLY_SLUG ? [ONLY_SLUG] : files.map(f => f.replace(/\.md$/, ''))).sort();

  const results = [];
  for (const slug of slugs) {
    const article = path.join(CONTENT_DIRS.blog, `${slug}.md`);
    if (!ONLY_SLUG && fs.existsSync(article)) {
      const { frontmatter } = splitArticle(read(article), slug);
      const draftFile = path.join(DRAFT_DIR, `${slug}.json`);
      if (/^heroImage:/m.test(frontmatter) && !fs.existsSync(draftFile)) continue;
    }
    const result = await backfillSlug(slug);
    if (result.skipped || !(result.missing ?? []).length) continue;
    results.push(result);
  }

  if (!APPLY) {
    console.log('\nMissing illustrations (run again with --apply to generate):');
    for (const r of results) console.log(`  ${r.slug}: image(s) ${r.missing.join(', ')}`);
    console.log(`\n${results.length} article(s), ${results.reduce((n, r) => n + r.missing.length, 0)} image(s).`);
    return;
  }

  console.log('\nBackfill summary:');
  let stillFailing = 0;
  for (const r of results) {
    console.log(`  ${r.slug}: generated ${r.done.join(', ') || 'none'}${r.failed?.length ? `; still failing ${r.failed.map(f => f.num).join(', ')}` : ''}`);
    stillFailing += r.failed?.length ?? 0;
  }
  if (stillFailing) {
    console.warn(`\n${stillFailing} image(s) still have no approved illustration. Their articles keep their text and stay publishable.`);
    process.exitCode = 1;
  }
}

main().catch(error => { console.error('Backfill failed:', error.message); process.exitCode = 1; });
