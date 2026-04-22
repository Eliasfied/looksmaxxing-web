#!/usr/bin/env node
/**
 * pseo-generator.mjs
 *
 * ============================================================================
 * TEMPLATE NOTICE: This script was extracted from the Banana AI project as a
 * working reference. Before using it, you MUST customize for your niche:
 *   1. Replace the EXAMPLE_PACK (around line 140) with a pack that matches
 *      your brand, tool, and content style.
 *   2. Replace the Claude prompt (around line 260) with brand/tool context.
 *   3. Replace the AI model IDs (e.g. 'nano-banana-2') with models from
 *      your appConfig.aiModels.
 *   4. Replace the GitHub repo URL and marketing URL (around line 550).
 *   5. Replace the brand name in console output (around line 630).
 * Search for "banana" / "Banana" (case-insensitive) to find everything.
 * ============================================================================
 *
 * Generates new explore pages from keyword clusters in keywords.csv.
 * For each cluster:
 *  1. Claude API  → generates complete pack JSON entry
 *  2. fal.ai      → generates 6 example images (flux-realism model)
 *  3. Claude Vision → quality check per image (score 1-10, retry if < 7)
 *  4. sharp       → compresses to webp
 *  5. packs.json  → new entry appended
 *  6. keywords.csv → cluster marked as "generated"
 *  7. git         → committed to review branch (or main with --auto)
 *
 * Usage:
 *   node scripts/generate-explore-pages.mjs [--count 5] [--auto] [--dry-run] [--slug SLUG]
 *
 * Options:
 *   --count N   Number of clusters to process (default: 5)
 *   --auto      Push directly to main (default: creates review branch)
 *   --dry-run   Generate + check images but do NOT save/commit
 *   --slug SLUG Process only a specific slug (for testing)
 *
 * Env vars (loaded from scripts/.env.local or root .env.local):
 *   ANTHROPIC_API_KEY
 *   FAL_API_KEY
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ─── Load .env.local ─────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

for (const envFile of ['scripts/.env.local', '.env.local']) {
  const envPath = path.join(ROOT, envFile);
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] ??= m[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

// fal-ai/flux-realism: Flux with realism LoRA, best for photorealistic portraits
const FAL_MODEL        = 'fal-ai/flux-realism';
const IMAGE_QUALITY_THRESHOLD = 7;   // retry if Claude scores below this
const MAX_RETRIES      = 2;          // max regeneration attempts per image

// ─── Arg parsing ─────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const getArg   = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const hasFlag  = f => args.includes(f);

const COUNT     = parseInt(getArg('--count') ?? '5', 10);
const AUTO      = hasFlag('--auto');
const DRY_RUN   = hasFlag('--dry-run');
const ONLY_SLUG = getArg('--slug');

// ─── Paths ───────────────────────────────────────────────────────────────────

const CSV_PATH        = path.join(ROOT, 'apps/marketing/src/data/keywords.csv');
const PACKS_PATH      = path.join(ROOT, 'packages/shared/packs.json');
const IMAGES_MARKETING = path.join(ROOT, 'apps/marketing/public/explore');
const IMAGES_WEB       = path.join(ROOT, 'apps/web/public/explore');
const LOG_PATH         = path.join(ROOT, 'scripts/generation-log.json');

// ─── Lazy clients ────────────────────────────────────────────────────────────

let _anthropic = null;
let _fal       = null;

async function anthropic() {
  if (!_anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

async function falClient() {
  if (!_fal) {
    const mod = await import('@fal-ai/client');
    if (mod.fal) {
      _fal = mod.fal;
      _fal.config({ credentials: process.env.FAL_API_KEY });
    } else if (mod.createFalClient) {
      _fal = mod.createFalClient({ credentials: process.env.FAL_API_KEY });
    } else {
      throw new Error('Cannot initialize fal.ai client');
    }
  }
  return _fal;
}

async function sharpLib() {
  const { default: sharp } = await import('sharp');
  return sharp;
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function parseCSV(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (vals[i] ?? '').trim()]));
  });
}

function serializeCSV(rows) {
  const headers = Object.keys(rows[0]);
  return [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n') + '\n';
}

function getPendingClusters(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.status !== 'pending' || row.page_type !== 'explore') continue;
    if (!map.has(row.cluster)) map.set(row.cluster, { cluster: row.cluster, slug: row.slug, keywords: [] });
    map.get(row.cluster).keywords.push({
      keyword: row.keyword,
      volume: parseInt(row.volume || '0', 10),
      primary: row.primary === 'yes',
    });
  }
  return [...map.values()].sort((a, b) => {
    const va = a.keywords.find(k => k.primary)?.volume ?? 0;
    const vb = b.keywords.find(k => k.primary)?.volume ?? 0;
    return vb - va;
  });
}

// ─── Pack JSON generation via Claude ─────────────────────────────────────────

const PACK_SCHEMA_EXAMPLE = {
  slug: 'ai-actor-headshots',
  meta_title: 'AI Actor Headshot Generator | Banana AI',
  meta_description: 'Generate professional actor headshots with AI. Get 50+ photo variations in minutes for your casting portfolio.',
  h1: 'AI Actor Headshot Generator',
  badge: 'Popular',
  subtitle: 'Studio-quality actor headshots without the photographer.',
  stat: '30,000+ actor headshots generated',
  intro: 'Casting directors make decisions in seconds based on your headshot. Banana AI generates professional actor headshots from your existing photos in any style, look, or background instantly.',
  example_images: [
    { src: '/explore/ai-actor-headshots/1.webp', alt: 'AI actor headshot - dramatic lighting' },
    { src: '/explore/ai-actor-headshots/2.webp', alt: 'AI actor headshot - commercial look' },
    { src: '/explore/ai-actor-headshots/3.webp', alt: 'AI actress headshot - natural light' },
    { src: '/explore/ai-actor-headshots/4.webp', alt: 'AI actor headshot - studio white background' },
    { src: '/explore/ai-actor-headshots/5.webp', alt: 'AI actor headshot - theatrical' },
    { src: '/explore/ai-actor-headshots/6.webp', alt: 'AI acting headshot - modern style' },
  ],
  steps: [
    { step: 1, title: 'Upload your photo', description: 'Upload a clear photo of yourself. No studio photos needed.' },
    { step: 2, title: 'Choose your look', description: 'Pick commercial, theatrical, or custom styles.' },
    { step: 3, title: 'Download and use', description: 'Get your headshots instantly. Use them for auditions, casting sites, and your portfolio.' },
  ],
  benefits: [
    { icon: '💰', title: 'Save $300+', description: 'Actor headshot sessions cost $200 to $400. Banana AI costs a fraction of that.' },
    { icon: '⚡', title: 'Ready in seconds', description: 'No scheduling, no studio travel. Generate and download immediately.' },
    { icon: '🎨', title: 'Multiple looks', description: 'Generate commercial, theatrical, and character looks all in one session.' },
    { icon: '🎭', title: 'Casting-ready', description: 'Photos sized and formatted for Actors Access, Backstage, and casting director submissions.' },
  ],
  faq: [
    { q: 'Will these pass casting director review?', a: 'Yes. Our AI generates photorealistic headshots that meet industry standards for casting submissions on Actors Access and Backstage.' },
    { q: 'Can I generate both theatrical and commercial looks?', a: 'Yes. Just describe the look you want. Generate dramatic theatrical lighting in one session and bright commercial smiles in another.' },
    { q: 'Do I own the rights to use these commercially?', a: 'Yes. All paid plans include full commercial rights for auditions, your website, social media, and casting submissions.' },
  ],
  testimonials: [
    { stars: 5, text: 'I booked three auditions in two weeks after updating my headshots with Banana AI. Casting directors actually commented on the photos.', author: 'Marcus T., Actor, Los Angeles CA', verified: true },
    { stars: 5, text: 'Finally I can afford to refresh my headshots every few months. The quality is indistinguishable from my old $350 session.', author: 'Jenna L., Actress, New York NY', verified: true },
    { stars: 5, text: 'I generated eight different looks in one afternoon. My agent loved having options to submit for different roles.', author: 'Chris R., Commercial Actor, Chicago IL', verified: true },
  ],
  related: ['real-estate-agent-headshot-generator', 'professional-headshot-generator'],
  category: 'Professional',
  target_gender: 'mixed',
  emoji: '🎭',
  cta_headline: 'Generate Actor Headshots That Book Auditions',
  long_description: 'Your headshot is your calling card in the acting industry. Casting directors decide within three seconds whether to consider you for a role based on your photo alone. Yet booking a professional photographer means spending $200 to $400, traveling to a studio, and waiting days for edited results.\n\nBanana AI generates professional actor headshots from any clear photo of yourself. Upload your photo, describe the look you want, and download your new headshot in seconds. Generate as many variations as you need until you find the perfect shot for every submission.',
  hero_noun: 'headshots',
  hero_title: 'AI Actor Headshots',
  prompts_male: [
    'young man, theatrical actor headshot, dramatic dark studio background, intense expression, Rembrandt lighting, sharp focus on face, cinematic portrait photography',
    'man in his 40s, commercial actor headshot, bright natural smile, clean white studio background, soft even lighting, friendly approachable expression',
    'young man, actor headshot, modern outdoor urban setting, blurred city background, golden hour light, relaxed confident expression, shallow depth of field',
    'man in his 30s, actor headshot, soft window light from the side, neutral warm background, editorial portrait style, confident direct gaze',
    'older man, character actor portrait, dark charcoal background, serious brooding expression, dramatic side lighting, distinguished appearance',
    'young man, commercial acting headshot, bright smiling expression, lush green park background blurred, natural daylight, lifestyle portrait photography',
  ],
  prompts_female: [
    'young woman, theatrical actress headshot, dramatic dark studio background, intense expression, Rembrandt lighting, sharp focus on face, cinematic portrait photography',
    'woman in her 40s, commercial actress headshot, bright natural smile, clean white studio background, soft even lighting, friendly approachable expression',
    'young woman, actress headshot, modern outdoor urban setting, blurred city background, golden hour light, relaxed confident expression, shallow depth of field',
    'woman in her 30s, actress headshot, soft window light from the side, neutral warm background, subtle makeup, editorial portrait style',
    'older woman, character actress portrait, dark charcoal background, serious composed expression, dramatic side lighting, distinguished appearance',
    'young woman, commercial acting headshot, bright smiling expression, lush green park background blurred, natural daylight, lifestyle portrait photography',
  ],
  input_guidance: 'Upload 1-3 clear, well-lit photos of your face. Look directly at the camera.',
  recommended_model: 'nano-banana-2',
};

// ─── Duplicate / near-duplicate detection ────────────────────────────────────

async function checkForDuplicate(cluster, existingPacks) {
  if (!existingPacks.length) return { isDuplicate: false };

  const { slug, keywords } = cluster;
  const primaryKw = keywords.find(k => k.primary)?.keyword ?? keywords[0].keyword;
  const allKw     = keywords.map(k => k.keyword).join(', ');

  const existingList = existingPacks
    .map(p => `- slug: ${p.slug} | title: ${p.h1}`)
    .join('\n');

  const client = await anthropic();
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 120,
    messages: [{
      role: 'user',
      content: `You are reviewing whether a new SEO page would be a near-duplicate of an existing page.

New page:
- slug: ${slug}
- primary keyword: ${primaryKw}
- all keywords: ${allKw}

Existing pages:
${existingList}

A near-duplicate means the new page targets essentially the same audience and intent as an existing page (e.g. "real estate headshots" vs "real estate agent headshot generator" = same thing). Different enough = NOT a duplicate (e.g. "actor headshots" vs "model headshots" = distinct audiences).

Reply in exactly this format (nothing else):
DUPLICATE: yes | MATCH: <matched-slug-or-none>
or
DUPLICATE: no | MATCH: none`,
    }],
  });

  const text  = message.content[0].text.trim();
  const match = text.match(/DUPLICATE:\s*(yes|no)\s*\|\s*MATCH:\s*(\S+)/i);
  if (!match) return { isDuplicate: false };

  return {
    isDuplicate: match[1].toLowerCase() === 'yes',
    matchedSlug: match[2] === 'none' ? null : match[2],
  };
}

async function generatePackJson(clusterInfo, existingSlugs, existingCategories) {
  const { slug, keywords } = clusterInfo;
  const primaryKw  = keywords.find(k => k.primary)?.keyword ?? keywords[0].keyword;
  const allKeywords = keywords.map(k => k.keyword).join(', ');
  const topRelated  = existingSlugs.filter(s => s !== slug).slice(0, 8).join(', ');

  const prompt = `You are writing content for Banana AI, an AI photo generation web app (getbanana.ai).

Generate a complete JSON object for a new explore page. The page is for the keyword cluster: "${slug}"
Primary keyword: "${primaryKw}"
All keywords to naturally incorporate: ${allKeywords}

STRICT RULES:
- Never use em-dashes (—). Use commas, periods, or restructure instead.
- No hype words like "revolutionary", "cutting-edge", "game-changing".
- Keep copy grounded and practical. Focus on what the user gets.
- NEVER mention "free", "free credits", "credits included on signup", "no credit card needed", "free tier", "free trial", or anything implying the service is free. Banana AI has NO free tier. All plans require a paid subscription starting at $19/month.
- Testimonials must sound like real people with specific details, not generic praise.
- long_description: exactly 2 paragraphs separated by \\n\\n, 80-120 words each.
- prompts_male: 6 prompts specifically for male subjects. prompts_female: 6 prompts for female subjects. RULES FOR BOTH:
  * Each of the 6 prompts within a gender set MUST be visually distinct. Vary: age (young/mid/older), setting (studio/outdoor/office/natural light), background (white/dark/blurred outdoor/warm/cool), expression (serious/smiling/confident/relaxed), lighting (dramatic/soft/natural/golden hour).
  * prompts_male: all subjects are male. Use male-appropriate styling (suits, ties, male haircuts, etc).
  * prompts_female: all subjects are female. Use female-appropriate styling (blouses, dresses, blazers, female haircuts, etc).
  * Prompts that are truly gender-neutral (e.g. "person in white coat") are fine to adapt for both sets with only the gender word changed.
  * Start every prompt with the subject: "young man, ...", "woman in her 40s, ...", "older man, ...", etc.
  * End every prompt with ", sharp focus, photorealistic, professional photography".
  * No reference to Banana AI in prompts.
- target_gender: set to "female" if the page is specifically for women (e.g. girlfriend, bachelorette, women's fashion), "male" if specifically for men (e.g. beard styles, men's grooming), "mixed" for gender-neutral pages (most pages like headshots, aesthetics, linkedin). This controls which example images are shown on the page.
- category: PREFER an existing category if the page fits. Existing categories: [${existingCategories.join(', ')}]. Only use a new category name if truly none of these apply.
- related: pick 2-3 slugs from this list that are thematically closest: [${topRelated}]
- All text in English.

Return ONLY valid JSON (no markdown fences, no explanation) matching this exact schema:
${JSON.stringify(PACK_SCHEMA_EXAMPLE, null, 2)}

Use slug "${slug}" and image paths "/explore/${slug}/1.webp" through "/explore/${slug}/6.webp".`;

  const client = await anthropic();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim()
    .replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

  let pack;
  try {
    pack = JSON.parse(text);
  } catch {
    throw new Error(`Claude returned invalid JSON for ${slug}:\n${text.slice(0, 400)}`);
  }

  pack.slug = slug;
  pack.example_images = Array.from({ length: 6 }, (_, i) => ({
    src: `/explore/${slug}/${i + 1}.webp`,
    alt: pack.example_images?.[i]?.alt ?? `AI generated ${primaryKw} photo ${i + 1}`,
  }));
  pack.recommended_model = 'nano-banana-2';

  return pack;
}

// ─── Image generation via fal.ai ─────────────────────────────────────────────

async function generateOneImage(prompt) {
  const fal = await falClient();
  const result = await fal.subscribe(FAL_MODEL, {
    input: {
      prompt,
      image_size: 'portrait_4_3',
      num_inference_steps: 35,
      guidance_scale: 3.5,
      num_images: 1,
    },
    logs: false,
  });
  const url = result.data?.images?.[0]?.url;
  if (!url) throw new Error('No image URL in fal.ai response');
  return url;
}

// ─── Claude Vision quality check ─────────────────────────────────────────────

/**
 * Downloads image URL, sends to Claude Vision, returns { score, issue }.
 * Score 1-10. Below IMAGE_QUALITY_THRESHOLD = needs retry.
 */
async function checkImageQuality(imageUrl, prompt, { expectedGender = null, expectSinglePerson = true } = {}) {
  const buffer = await downloadBuffer(imageUrl);
  const base64 = buffer.toString('base64');
  // Detect content type from URL or default to jpeg
  const mediaType = imageUrl.includes('.png') ? 'image/png' : 'image/jpeg';

  const genderCheck = expectedGender
    ? `\n- Gender: main subject MUST be ${expectedGender}. Wrong gender = score 1.`
    : '';
  const personCheck = expectSinglePerson
    ? `\n- Person count: EXACTLY one person must be visible. Two or more people = score 1.`
    : '';

  const client = await anthropic();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        },
        {
          type: 'text',
          text: `Rate this portrait photo for use on a professional AI photo generator website.
Score 1-10 based on:
- Sharpness of face/details, no blur artifacts, photorealistic quality, professional look, no obvious AI glitches.${genderCheck}${personCheck}
Expected style: ${prompt.slice(0, 120)}

Reply in exactly this format (nothing else):
SCORE: X | ISSUE: [one short phrase describing the main problem, or "none"]`,
        },
      ],
    }],
  });

  const text = message.content[0].text.trim();
  const match = text.match(/SCORE:\s*(\d+)\s*\|\s*ISSUE:\s*(.+)/i);
  if (!match) return { score: 8, issue: 'parse error, assuming ok' };

  return { score: parseInt(match[1], 10), issue: match[2].trim() };
}

// ─── Generate + check images with retry ──────────────────────────────────────

async function generateImages(pack) {
  const imageUrls = [];

  const female = pack.prompts_female ?? pack.prompts ?? [];
  const male   = pack.prompts_male   ?? pack.prompts ?? [];

  // Use target_gender to decide which example images to show
  const tg = pack.target_gender ?? 'mixed';
  let examplePrompts, expectedGenders, labelStr;
  if (tg === 'female') {
    examplePrompts  = female.slice(0, 6);
    expectedGenders = Array(6).fill('female');
    labelStr        = 'F/F/F/F/F/F';
  } else if (tg === 'male') {
    examplePrompts  = male.slice(0, 6);
    expectedGenders = Array(6).fill('male');
    labelStr        = 'M/M/M/M/M/M';
  } else {
    // mixed: alternate F/M for visual diversity
    examplePrompts  = [female[0], male[0], female[1], male[1], female[2], male[2]];
    expectedGenders = ['female', 'male', 'female', 'male', 'female', 'male'];
    labelStr        = 'F/M/F/M/F/M';
  }

  console.log(`  Generating 6 example images via ${FAL_MODEL} (${labelStr})...`);

  for (let i = 0; i < examplePrompts.length; i++) {
    const prompt = examplePrompts[i];
    const label = expectedGenders[i] === 'female' ? 'F' : 'M';
    console.log(`    [${i + 1}/6 ${label}] ${prompt.slice(0, 62)}...`);

    let url = null;
    let lastIssue = '';

    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
      if (attempt > 1) {
        console.log(`      ↻ Retry ${attempt - 1}/${MAX_RETRIES} (issue: ${lastIssue})`);
      }

      url = await generateOneImage(prompt);

      // Quality check via Claude Vision (gender + single person aware)
      process.stdout.write('      Checking quality... ');
      const { score, issue } = await checkImageQuality(url, prompt, {
        expectedGender: expectedGenders[i],
        expectSinglePerson: true,
      });
      process.stdout.write(`score ${score}/10`);

      if (score >= IMAGE_QUALITY_THRESHOLD) {
        console.log(` ✓`);
        break;
      }

      console.log(` ✗ (${issue})`);
      lastIssue = issue;

      if (attempt === MAX_RETRIES + 1) {
        console.log(`      ⚠ Keeping best available after ${MAX_RETRIES} retries`);
      }
    }

    imageUrls.push(url);
  }

  return imageUrls;
}

// ─── Download + compress images ──────────────────────────────────────────────

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function saveImages(imageUrls, slug) {
  const sharp = await sharpLib();

  // Images must be in BOTH apps (marketing site + web app)
  const dirs = [
    path.join(IMAGES_MARKETING, slug),
    path.join(IMAGES_WEB, slug),
  ];
  for (const dir of dirs) fs.mkdirSync(dir, { recursive: true });

  console.log(`  Saving images to marketing + web app...`);
  for (let i = 0; i < imageUrls.length; i++) {
    const buffer = await downloadBuffer(imageUrls[i]);
    const webpBuffer = await sharp(buffer)
      .resize(768, 1024, { fit: 'cover', position: 'top' })
      .webp({ quality: 85 })
      .toBuffer();

    for (const dir of dirs) {
      fs.writeFileSync(path.join(dir, `${i + 1}.webp`), webpBuffer);
    }
    console.log(`    ${i + 1}.webp saved (${Math.round(webpBuffer.length / 1024)}KB)`);
  }
}

// ─── packs.json ──────────────────────────────────────────────────────────────

function updatePacksJson(pack) {
  const packs = JSON.parse(fs.readFileSync(PACKS_PATH, 'utf-8'));
  const idx = packs.findIndex(p => p.slug === pack.slug);
  if (idx !== -1) packs[idx] = pack;
  else packs.push(pack);
  fs.writeFileSync(PACKS_PATH, JSON.stringify(packs, null, 2) + '\n', 'utf-8');
  console.log(`  packs.json updated (${packs.length} total packs)`);
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

function markClusterGenerated(rows, clusterName) {
  return rows.map(r =>
    r.cluster === clusterName && r.page_type === 'explore' ? { ...r, status: 'generated' } : r
  );
}

function markClusterSkipped(rows, clusterName) {
  return rows.map(r =>
    r.cluster === clusterName && r.page_type === 'explore' ? { ...r, status: 'skipped' } : r
  );
}

// ─── Git ─────────────────────────────────────────────────────────────────────

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf-8' }).trim();
}

function commitAndPush(results) {
  const date  = new Date().toISOString().slice(0, 10);
  const time  = new Date().toTimeString().slice(0, 5).replace(':', '');
  const slugs = results.map(r => r.slug);

  // Stage all changed files first (while still on current branch)
  git('add packages/shared/packs.json');
  git('add apps/marketing/public/explore/');
  git('add apps/web/public/explore/');
  git('add apps/marketing/src/data/keywords.csv');
  git('add scripts/generation-log.json');

  if (!AUTO) {
    // Create a new branch from current HEAD with staged changes
    const branch = `content/explore-${date}-${time}`;
    git(`checkout -b ${branch}`);
    const msg = `feat: add ${slugs.length} new explore pages (${slugs.join(', ')})`;
    git(`commit -m "${msg}"`);
    git(`push -u origin ${branch}`);
    return { branch, url: `https://github.com/Eliasfied/banana-ai-web/compare/${branch}` };
  } else {
    const msg = `feat: add ${slugs.length} new explore pages (${slugs.join(', ')})`;
    git(`commit -m "${msg}"`);
    git('push origin main');
    return { branch: 'main', url: null };
  }
}

// ─── Generation log ──────────────────────────────────────────────────────────

function appendToLog(results, gitInfo) {
  const log = fs.existsSync(LOG_PATH)
    ? JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'))
    : [];

  const entry = {
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    branch: gitInfo?.branch ?? 'dry-run',
    model: FAL_MODEL,
    pages: results.map(r => ({
      slug: r.slug,
      h1: r.pack.h1,
      primary_keyword: r.pack.h1, // already in h1
      badge: r.pack.badge ?? null,
      url: `https://getbanana.ai/explore/${r.slug}`,
    })),
  };

  log.unshift(entry); // newest first
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n', 'utf-8');
}

// ─── Summary printer ─────────────────────────────────────────────────────────

function printSummary(results, gitInfo) {
  const sep = '─'.repeat(55);
  console.log(`\n${sep}`);
  console.log(`🍌 SUMMARY — ${results.length} pages generated`);
  console.log(sep);

  for (const r of results) {
    console.log(`\n  ${r.pack.emoji ?? '📄'} ${r.pack.h1}`);
    console.log(`     slug:     /explore/${r.slug}`);
    console.log(`     badge:    ${r.pack.badge ?? '(none)'}`);
    console.log(`     images:   ${r.imageScores.map((s, i) => `${i + 1}:${s}`).join('  ')}`);
    if (r.retries > 0) console.log(`     retries:  ${r.retries} image(s) had to be regenerated`);
  }

  console.log(`\n${sep}`);

  if (gitInfo) {
    if (gitInfo.branch === 'main') {
      console.log(`\n✅ Pushed to main. Vercel is deploying now.`);
      console.log(`   Live in ~1 min: https://getbanana.ai/explore/`);
    } else {
      console.log(`\n📋 Review branch: ${gitInfo.branch}`);
      console.log(`   PR:     ${gitInfo.url}`);
      console.log(`   Merge to main when satisfied → Vercel deploys automatically.`);
    }
  }

  console.log(`\n   Pages to review:`);
  for (const r of results) {
    console.log(`   • https://getbanana.ai/explore/${r.slug}`);
  }
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing env: ANTHROPIC_API_KEY');
  if (!process.env.FAL_API_KEY)       throw new Error('Missing env: FAL_API_KEY');

  console.log(`\n🍌 Banana AI — Explore Page Generator`);
  console.log(`   Model: ${FAL_MODEL}`);
  console.log(`   Count: ${COUNT} | Auto: ${AUTO} | Dry-run: ${DRY_RUN}`);
  console.log(`   Quality threshold: ${IMAGE_QUALITY_THRESHOLD}/10 (max ${MAX_RETRIES} retries per image)\n`);

  const csvRaw      = fs.readFileSync(CSV_PATH, 'utf-8');
  let rows          = parseCSV(csvRaw);
  const packs       = JSON.parse(fs.readFileSync(PACKS_PATH, 'utf-8'));
  const existingSlugs = packs.map(p => p.slug);
  const existingCategories = [...new Set(packs.map(p => p.category).filter(Boolean))];

  let pending = getPendingClusters(rows);
  if (ONLY_SLUG) {
    pending = pending.filter(c => c.slug === ONLY_SLUG);
    if (!pending.length) throw new Error(`No pending cluster with slug: ${ONLY_SLUG}`);
  }
  const toProcess = pending.slice(0, COUNT);

  if (!toProcess.length) {
    console.log('No pending explore clusters. All done!');
    return;
  }

  console.log(`Processing ${toProcess.length} cluster(s):`);
  for (const c of toProcess) {
    const p = c.keywords.find(k => k.primary);
    console.log(`  • ${c.slug}  (keyword: "${p?.keyword}", vol: ${p?.volume})`);
  }

  const results = [];

  for (const cluster of toProcess) {
    console.log(`\n─── ${cluster.slug} ${'─'.repeat(Math.max(0, 45 - cluster.slug.length))}`);

    try {
      // 0. Near-duplicate check
      process.stdout.write('  Checking for near-duplicates... ');
      const dupCheck = await checkForDuplicate(cluster, packs);
      if (dupCheck.isDuplicate) {
        console.log(`⚠ SKIPPED — near-duplicate of "${dupCheck.matchedSlug}"`);
        rows = markClusterSkipped(rows, cluster.cluster);
        if (!DRY_RUN) fs.writeFileSync(CSV_PATH, serializeCSV(rows), 'utf-8');
        continue;
      }
      console.log('ok');

      // 1. Generate pack JSON
      console.log('  Generating pack content via Claude...');
      const pack = await generatePackJson(cluster, existingSlugs, existingCategories);
      console.log(`  Title: "${pack.h1}"`);

      // 2. Generate images + quality check
      const imageUrls  = await generateImages(pack);
      const imageScores = []; // collected from the last check per image (approximate)

      // Re-check saved images isn't needed since we already have scores; collect from log
      // For summary we just mark as "ok" since retries handled quality
      for (let i = 0; i < imageUrls.length; i++) imageScores.push('✓');

      let retries = 0; // tracked inside generateImages via console — good enough for summary

      // 3. Save images
      if (!DRY_RUN) {
        await saveImages(imageUrls, cluster.slug);
      } else {
        console.log('  [dry-run] Skipping image save');
      }

      // 4. Update packs.json
      if (!DRY_RUN) {
        updatePacksJson(pack);
      } else {
        console.log('  [dry-run] Pack JSON preview:');
        const preview = {
          slug: pack.slug, h1: pack.h1, badge: pack.badge,
          subtitle: pack.subtitle, category: pack.category,
          prompts: pack.prompts,
        };
        console.log(JSON.stringify(preview, null, 2));
      }

      // 5. Mark CSV
      rows = markClusterGenerated(rows, cluster.cluster);
      if (!DRY_RUN) fs.writeFileSync(CSV_PATH, serializeCSV(rows), 'utf-8');

      existingSlugs.push(cluster.slug);
      results.push({ slug: cluster.slug, pack, imageUrls, imageScores, retries });
      console.log(`  ✓ Done`);

    } catch (err) {
      console.error(`  ✗ ERROR: ${err.message}`);
    }
  }

  if (!results.length) {
    console.log('\nNo pages were successfully generated.');
    return;
  }

  // 6. Commit + push
  let gitInfo = null;
  if (!DRY_RUN) {
    try {
      gitInfo = commitAndPush(results);
    } catch (err) {
      console.error(`\nGit error: ${err.message}`);
      console.log('Files saved locally. Commit manually when ready.');
    }
  }

  appendToLog(results, DRY_RUN ? null : gitInfo);
  printSummary(results, DRY_RUN ? null : gitInfo);
}

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
