#!/usr/bin/env node
/**
 * generate-content.mjs
 *
 * Generates blog posts, tool landing pages, and glossary entries
 * from keywords.csv into Astro Content Collections.
 *
 * For each pending row in keywords.csv:
 *  1. Claude API  → generates JSON for the page (type-specific schema)
 *  2. Writes  → apps/marketing/src/content/<type>/<slug>.md
 *  3. Updates → keywords.csv (status=pending → generated)
 *  4. Git     → commits to review branch (or main with --auto)
 *
 * Usage:
 *   node scripts/generate-content.mjs [--count 3] [--types blog,tool,glossary] [--phase 1] [--auto] [--dry-run] [--slug SLUG]
 *
 * Options:
 *   --count N           Number of pages to generate (default: 3)
 *   --types LIST        Comma-separated types to process: blog,tool,glossary (default: all)
 *   --phase N           Only process rows from this phase (1, 2, or 3)
 *   --auto              Commit directly to main (default: review branch)
 *   --dry-run           Generate + print but do NOT save/commit
 *   --slug SLUG         Process only a specific slug (for testing)
 *
 * Env vars (in scripts/.env.local or root .env.local):
 *   ANTHROPIC_API_KEY
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ─── Setup ───────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Load .env files. Later files do NOT override earlier ones, but empty/missing
// vars are filled in. The root .env.local takes priority.
for (const envFile of ['.env.local', 'scripts/.env.local', 'apps/marketing/.env.local']) {
  const envPath = path.join(ROOT, envFile);
  if (!fs.existsSync(envPath)) continue;
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/\r$/, '').replace(/^['"]|['"]$/g, '');
    if (!val) continue;                                  // skip empty values
    if (!process.env[key] || process.env[key] === '') {  // override empty/missing
      process.env[key] = val;
    }
  }
}

// ─── Args ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = f => { const i = args.indexOf(f); return i !== -1 ? args[i + 1] : null; };
const hasFlag = f => args.includes(f);

const COUNT = parseInt(getArg('--count') ?? '3', 10);
const TYPES = (getArg('--types') ?? 'blog,tool,glossary').split(',').map(s => s.trim());
const PHASE = getArg('--phase') ? parseInt(getArg('--phase'), 10) : null;
const AUTO = hasFlag('--auto');
const DRY_RUN = hasFlag('--dry-run');
const NO_IMAGES = hasFlag('--no-images');
const ONLY_SLUG = getArg('--slug');

// ─── Paths ──────────────────────────────────────────────────────────────────
const CSV_PATH = path.join(ROOT, 'apps/marketing/src/data/keywords.csv');
const CONTENT_BASE = path.join(ROOT, 'apps/marketing/src/content');
const PUBLIC_BASE = path.join(ROOT, 'apps/marketing/public');
const CONTENT_DIRS = {
  blog: path.join(CONTENT_BASE, 'blog'),
  tool: path.join(CONTENT_BASE, 'tools'),
  glossary: path.join(CONTENT_BASE, 'glossary'),
};

// ─── Lazy Anthropic client ──────────────────────────────────────────────────
let _anthropic = null;
async function anthropic() {
  if (!_anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ─── Lazy fal.ai client ─────────────────────────────────────────────────────
let _fal = null;
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

// ─── HTTP download helper ───────────────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ─── CSV helpers ────────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c === '\r') {} else cur += c;
    }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function loadCsvAsObjects() {
  const text = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(text).filter(r => r.length > 1);
  const headers = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])));
}

function writeCsvFromObjects(objs) {
  const headers = ['keyword', 'volume', 'sd', 'cluster', 'slug', 'status', 'page_type', 'primary', 'phase'];
  const csv = [
    headers.join(','),
    ...objs.map(o => headers.map(h => {
      const v = String(o[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')),
  ].join('\n') + '\n';
  fs.writeFileSync(CSV_PATH, csv);
}

// ─── Pick pending pages (one row per slug, primary keyword only) ────────────
function getPendingPages(rows) {
  // Group by slug and grab the primary keyword + all related keywords
  const map = new Map();
  for (const row of rows) {
    if (row.status !== 'pending') continue;
    if (!TYPES.includes(row.page_type)) continue;
    if (PHASE !== null && parseInt(row.phase, 10) !== PHASE) continue;
    if (ONLY_SLUG && row.slug !== ONLY_SLUG) continue;

    if (!map.has(row.slug)) {
      map.set(row.slug, {
        slug: row.slug, cluster: row.cluster, page_type: row.page_type, phase: parseInt(row.phase, 10),
        keywords: [], primary_keyword: '', primary_volume: 0,
      });
    }
    const e = map.get(row.slug);
    e.keywords.push({ keyword: row.keyword, volume: parseInt(row.volume || '0', 10) });
    if (row.primary === 'yes') {
      e.primary_keyword = row.keyword;
      e.primary_volume = parseInt(row.volume || '0', 10);
    }
  }
  // Make sure we have a primary keyword for each (fallback to highest volume)
  for (const e of map.values()) {
    if (!e.primary_keyword && e.keywords.length) {
      e.keywords.sort((a, b) => b.volume - a.volume);
      e.primary_keyword = e.keywords[0].keyword;
      e.primary_volume = e.keywords[0].volume;
    }
  }
  // Sort: phase asc, then volume desc
  return [...map.values()].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    return b.primary_volume - a.primary_volume;
  });
}

// ─── PROMPT TEMPLATES ───────────────────────────────────────────────────────

const SHARED_RULES = `
STRICT WRITING RULES:
- Never use em-dashes (—). Use commas, periods, or restructure.
- No hype words (revolutionary, cutting-edge, game-changing, supercharge).
- NEVER include a year, date, or "(2024)", "(2025)", "(2026)" etc. in titles, H1, or meta titles. Make titles evergreen.
- NEVER write "Updated YYYY", "in YYYY", "for YYYY" anywhere in titles or descriptions.
- Grounded, practical, specific. No fluff.
- Mention the Aura app naturally where relevant. Aura is an AI face-rating and looksmaxxing app at app.aura-looksmaxxing.com that gives PSL scores, jawline analysis, hunter-eye detection, and personalized improvement plans.
- NEVER promise medical results. Use phrases like "may help", "some users report", "research suggests".
- For procedure articles (surgeries, drugs): always include a "Talk to a qualified professional before considering this" disclaimer.
- All text in English.
- Tone: confident but balanced. Treat the reader as smart and motivated, not desperate.
- Do NOT include the title in the markdown body (it's already in frontmatter).
- Do NOT mention "looksmax.org", "lookism.net", or any forum by name as a source.
`;

const BLOG_PROMPT = (page) => `You are writing a long-form SEO blog post for Aura, an AI looksmaxxing app.

PAGE INFO:
- Cluster: ${page.cluster}
- Slug: ${page.slug}
- Primary keyword: "${page.primary_keyword}" (volume: ${page.primary_volume}/mo)
- Related keywords to weave in naturally: ${page.keywords.map(k => k.keyword).slice(1, 12).join(', ') || '(none)'}

GOAL:
Rank for "${page.primary_keyword}" and adjacent searches. Convert readers to Aura app users via subtle CTA placement.

LENGTH:
1500-2200 words of body markdown.
Structure: intro hook → main sections (h2/h3) → practical tips → FAQ.

${SHARED_RULES}

CTA RULES:
- Include 1 to 2 natural mentions of Aura inside the body where it genuinely helps the reader (e.g., "to get an objective baseline before starting"). Format as a markdown link: [Aura](https://app.aura-looksmaxxing.com).
- The CTA must feel useful, not promotional. If Aura honestly does not fit the article topic, include only ONE mention or skip entirely. Never force it.
- Do NOT include phrases like "Try Aura now!" or "Sign up today!" inside the body. The page already has a bottom CTA section auto-rendered.

IMAGE RULES:
- We have 3 images per article: image 1 is the HERO (auto-rendered at the top, do NOT place it in the body), images 2 and 3 are INLINE in the body.
- Insert exactly TWO inline placeholders: \`{{IMAGE_2}}\` and \`{{IMAGE_3}}\`. Do NOT use \`{{IMAGE_1}}\` in the body. Do NOT use markdown image syntax.
- Each placeholder goes on its own line with blank lines before and after.
- Distribute them: \`{{IMAGE_2}}\` around the middle of the article (after a couple H2 sections). \`{{IMAGE_3}}\` in the lower third (before the FAQ-related content).
- Example placement:
  \`\`\`
  ## Some H2

  Content paragraph.

  {{IMAGE_2}}

  More content.
  \`\`\`
- Provide exactly 3 image_prompts in the JSON.
  * image_prompts[0] = HERO image: a big-picture, eye-catching overview visual that represents the topic at a glance. Avoid being too detail-heavy.
  * image_prompts[1] and image_prompts[2] = INLINE supporting visuals: more specific, drilled-down concepts (anatomy diagrams, before/after concepts, technique demonstrations, comparison visuals).
  * Each prompt must:
    - Describe an EDUCATIONAL or ILLUSTRATIVE visual (no abstract concepts).
    - Be specific and visual.
    - Avoid celebrity faces, real-person likenesses, or copyrighted material.
    - Match the article topic precisely.
    - Be ~2 sentences, focused on what should be SHOWN.
    - All 3 images must be VISUALLY DISTINCT from each other (different framing, subject, or angle).

Return ONLY valid JSON (no markdown fences, no preamble) matching this exact schema:
{
  "title": "SEO title with primary keyword (under 60 chars, NO YEAR)",
  "description": "Meta description (140-160 chars) with primary keyword + benefit",
  "h1_displayed": "The on-page title shown in <h1>. Slightly different from meta title is OK. NO YEAR.",
  "reading_time": 8,
  "tags": ["tag1", "tag2", "tag3"],
  "body_markdown": "## First H2\\n\\nFirst paragraph...\\n\\n## Second H2\\n\\nMore content...\\n\\n{{IMAGE_2}}\\n\\n## Third H2\\n\\n... {{IMAGE_3}} ...",
  "image_prompts": [
    { "prompt": "Detailed visual description for the first image, e.g. clean educational diagram showing X.", "alt": "Alt text for image 1, with primary keyword if natural" },
    { "prompt": "Visual description for image 2.", "alt": "Alt text for image 2" },
    { "prompt": "Visual description for image 3.", "alt": "Alt text for image 3" }
  ],
  "faq": [
    { "q": "Question 1?", "a": "Direct answer in 2-3 sentences." },
    { "q": "Question 2?", "a": "..." },
    { "q": "Question 3?", "a": "..." },
    { "q": "Question 4?", "a": "..." }
  ]
}

In body_markdown:
- ## for main sections (5-8 of them)
- ### for sub-sections
- Bold and italic where it adds emphasis
- Bullet/numbered lists where appropriate
- Real anatomical/scientific terms where appropriate but explain them
- For "vs" comparison posts: include a side-by-side comparison
- For "how to" posts: include numbered actionable steps`;

const TOOL_PROMPT = (page) => `You are writing a tool landing page for Aura, an AI looksmaxxing app at app.aura-looksmaxxing.com.

The tool is hosted INSIDE the Aura web app. This page is a marketing landing page that ranks on Google and converts visitors into app users (the CTA points to the registration page).

PAGE INFO:
- Cluster: ${page.cluster}
- Slug: ${page.slug}
- Primary keyword: "${page.primary_keyword}" (volume: ${page.primary_volume}/mo)
- Related keywords: ${page.keywords.map(k => k.keyword).slice(1, 10).join(', ') || '(none)'}

${SHARED_RULES}

IMAGE RULE:
- Provide exactly ONE image_prompt for the HERO image. The image will be displayed in the top-right of the landing page next to the H1.
- The prompt must describe a tool-themed visual: e.g. an abstract phone-screen mockup of the tool, a stylized facial-analysis interface, a clean conceptual visual representing the tool's output. Avoid celebrity faces or real-person likenesses.
- Be ~2 sentences, focused on what should be SHOWN.

Return ONLY valid JSON matching this exact schema:
{
  "title": "SEO meta title with primary kw (under 60 chars, NO YEAR)",
  "description": "Meta description 140-160 chars",
  "h1": "On-page H1 (the big headline visitors see, NO YEAR)",
  "subtitle": "1-2 sentence subtitle under H1 explaining what the tool does",
  "cta_label": "Open the [Tool Name]",
  "badge": "Free / Popular / New / null",
  "image_prompt": { "prompt": "Visual description of the hero image", "alt": "Alt text with the primary keyword if natural" },
  "benefits": [
    { "icon": "💯", "title": "Benefit 1", "description": "One sentence." },
    { "icon": "⚡", "title": "Benefit 2", "description": "One sentence." },
    { "icon": "🎯", "title": "Benefit 3", "description": "One sentence." },
    { "icon": "🔒", "title": "Benefit 4", "description": "One sentence." }
  ],
  "steps": [
    { "step": 1, "title": "Step 1 title", "description": "Sentence." },
    { "step": 2, "title": "Step 2 title", "description": "Sentence." },
    { "step": 3, "title": "Step 3 title", "description": "Sentence." }
  ],
  "body_markdown": "## What is [topic]\\n\\n4-6 paragraphs of useful supporting content with H2/H3 structure...\\n\\n## How [tool] works\\n\\n...\\n\\n## Tips for accurate results\\n\\n...",
  "faq": [
    { "q": "Is it free?", "a": "Yes, Aura offers a free face rating with optional premium features for deeper analysis." },
    { "q": "How accurate is it?", "a": "..." },
    { "q": "Do I need to upload my photo?", "a": "..." },
    { "q": "Is my data safe?", "a": "..." },
    { "q": "Can I use it on mobile?", "a": "..." }
  ]
}

body_markdown should be 600-1000 words of supporting content (NOT promotional copy — actual useful content about the topic).
Use realistic emoji for benefits (💯⚡🎯🔒📊🤖💪✨🎨📱).
The "badge" field can be set to "Free" for the most popular tools or null otherwise.`;

const GLOSSARY_PROMPT = (page) => `You are writing a short glossary entry for Aura's looksmaxxing dictionary.

TERM:
- Slug: ${page.slug}
- Primary keyword: "${page.primary_keyword}" (volume: ${page.primary_volume}/mo)
- Related search variations: ${page.keywords.map(k => k.keyword).slice(1, 8).join(', ') || '(none)'}

${SHARED_RULES}

Return ONLY valid JSON:
{
  "term": "The proper term as displayed (e.g. 'HTN' or 'Hunter Eyes')",
  "abbreviation": "If applicable, the full form (e.g. 'High-Tier Normie'). Empty string if not.",
  "title": "SEO meta title (under 60 chars). Format: '[Term] Meaning - Looksmaxxing Glossary'",
  "description": "Meta description 140-160 chars. Define the term + context.",
  "short_definition": "ONE clear sentence defining the term. Shown right under H1.",
  "body_markdown": "## What does [term] mean\\n\\n2-3 paragraphs explaining the term in plain English.\\n\\n## Origin\\n\\nWhere the term comes from (1 paragraph).\\n\\n## How it relates to looksmaxxing\\n\\n1-2 paragraphs.",
  "examples": [
    "Example sentence 1 using the term in context.",
    "Example sentence 2.",
    "Example sentence 3."
  ],
  "related_terms": ["slug-of-related-term-1", "slug-of-related-term-2"]
}

LENGTH: body_markdown should be 200-450 words total. Tight, definitional, useful.
For abbreviations like HTN/LTN/MTN: explain what the letters stand for AND how it's used.
For meme-y terms (jestermaxxing, goyslop): explain the cultural context without endorsing edgy ideologies.
NEVER glorify negative concepts. For inceloid terms: define them factually but neutrally.`;

const PROMPT_BUILDERS = {
  blog: BLOG_PROMPT,
  tool: TOOL_PROMPT,
  glossary: GLOSSARY_PROMPT,
};

// ─── Generate content via Claude ────────────────────────────────────────────
async function generatePage(page) {
  const builder = PROMPT_BUILDERS[page.page_type];
  if (!builder) throw new Error(`Unknown page_type: ${page.page_type}`);
  const prompt = builder(page);

  const client = await anthropic();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].text.trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '');

  let data;
  try { data = JSON.parse(text); }
  catch (e) {
    throw new Error(`Claude returned invalid JSON for ${page.slug}:\n${text.slice(0, 500)}`);
  }
  return data;
}

// ─── Frontmatter helpers ────────────────────────────────────────────────────
function escapeYaml(v) {
  if (typeof v !== 'string') return v;
  if (v.includes('\n') || v.includes('"') || v.includes(':') || v.includes("'")) {
    return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return v;
}

function buildFrontmatter(obj) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      if (v.length === 0) { lines.push(`${k}: []`); continue; }
      if (typeof v[0] === 'object') {
        lines.push(`${k}:`);
        for (const item of v) {
          const pairs = Object.entries(item).map(([ik, iv]) => `${ik}: ${escapeYaml(String(iv))}`);
          lines.push(`  - ${pairs[0]}`);
          for (const p of pairs.slice(1)) lines.push(`    ${p}`);
        }
      } else {
        lines.push(`${k}: [${v.map(x => escapeYaml(String(x))).join(', ')}]`);
      }
    } else {
      lines.push(`${k}: ${escapeYaml(String(v))}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

// ─── Save markdown to content collection ────────────────────────────────────
async function saveBlogMarkdown(page, data) {
  const today = new Date().toISOString().split('T')[0];

  // Generate the 3 images first
  const prompts = (data.image_prompts ?? []).slice(0, 3);
  const images = await generateBlogImages(page.slug, prompts);
  const heroImage = images.find(i => i.num === 1 && i.publicPath);

  // Inject images into body markdown
  const bodyWithImages = injectImagesIntoBody(data.body_markdown, images);

  const fm = {
    title: data.title,
    description: data.description,
    slug: page.slug,
    primary_keyword: page.primary_keyword,
    cluster: page.cluster,
    pubDate: today,
    heroImage: heroImage?.publicPath,
    heroImageAlt: heroImage?.alt,
    tags: data.tags ?? [],
    readingTime: data.reading_time ?? 8,
    related: [],
    faq: data.faq ?? [],
    draft: false,
  };
  const body = `${buildFrontmatter(fm)}\n\n${bodyWithImages}\n`;
  const out = path.join(CONTENT_DIRS.blog, `${page.slug}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body);
  return out;
}

async function saveToolMarkdown(page, data) {
  const today = new Date().toISOString().split('T')[0];

  // Generate 1 hero image
  let hero = null;
  if (data.image_prompt?.prompt) {
    const images = await generateToolImage(page.slug, data.image_prompt);
    hero = images.find(i => i.publicPath);
  }

  const fm = {
    title: data.title,
    description: data.description,
    slug: page.slug,
    primary_keyword: page.primary_keyword,
    cluster: page.cluster,
    pubDate: today,
    h1: data.h1,
    subtitle: data.subtitle,
    cta_label: data.cta_label ?? 'Open the App',
    badge: data.badge && data.badge !== 'null' ? data.badge : undefined,
    heroImage: hero?.publicPath,
    heroImageAlt: hero?.alt,
    benefits: data.benefits ?? [],
    steps: data.steps ?? [],
    faq: data.faq ?? [],
    related: [],
    draft: false,
  };
  const body = `${buildFrontmatter(fm)}\n\n${data.body_markdown}\n`;
  const out = path.join(CONTENT_DIRS.tool, `${page.slug}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body);
  return out;
}

async function generateToolImage(slug, imagePrompt) {
  if (NO_IMAGES) {
    console.log(`   ⏭️  Skipping image generation (--no-images)`);
    return [];
  }
  if (!process.env.FAL_API_KEY) {
    console.warn(`   ⚠️  FAL_API_KEY not set; skipping image generation`);
    return [];
  }

  const outDir = path.join(PUBLIC_BASE, 'tools', slug);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `hero.webp`);
  const publicPath = `/tools/${slug}/hero.webp`;

  try {
    console.log(`   🎨 Hero image: ${imagePrompt.prompt.slice(0, 60)}...`);
    const url = await generateOneImage(imagePrompt.prompt);
    const png = await downloadBuffer(url);
    const webp = await compressToWebp(png);
    fs.writeFileSync(outPath, webp);
    const sizeKb = (webp.length / 1024).toFixed(0);
    console.log(`      ✓ Saved ${publicPath} (${sizeKb} KB)`);
    return [{ publicPath, alt: imagePrompt.alt || 'Hero image' }];
  } catch (e) {
    console.warn(`      ❌ Hero image failed: ${e.message}`);
    return [];
  }
}

async function saveGlossaryMarkdown(page, data) {
  const today = new Date().toISOString().split('T')[0];
  const fm = {
    title: data.title,
    description: data.description,
    slug: page.slug,
    term: data.term,
    abbreviation: data.abbreviation || undefined,
    primary_keyword: page.primary_keyword,
    cluster: page.cluster,
    pubDate: today,
    short_definition: data.short_definition,
    related_terms: data.related_terms ?? [],
    examples: data.examples ?? [],
    draft: false,
  };
  const body = `${buildFrontmatter(fm)}\n\n${data.body_markdown}\n`;
  const out = path.join(CONTENT_DIRS.glossary, `${page.slug}.md`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, body);
  return out;
}

const SAVERS = { blog: saveBlogMarkdown, tool: saveToolMarkdown, glossary: saveGlossaryMarkdown };

// ─── FAL gpt-image-2 image generation ───────────────────────────────────────
const IMAGE_MODEL = 'openai/gpt-image-2';
const STYLE_SUFFIX = ', clean modern educational illustration, minimalist style, soft purple and dark navy color palette, no text, no labels, no watermarks, professional infographic aesthetic';

async function generateOneImage(prompt) {
  const fal = await falClient();
  const result = await fal.subscribe(IMAGE_MODEL, {
    input: {
      prompt: prompt + STYLE_SUFFIX,
      image_size: 'square_hd',
      quality: 'low',
      num_images: 1,
      output_format: 'png',
    },
    logs: false,
  });
  // GPT-Image-2 returns either { images: [{url}] } or { image: {url} }
  const url = result.data?.images?.[0]?.url
    ?? result.data?.image?.url
    ?? result.images?.[0]?.url;
  if (!url) throw new Error(`No image URL in fal.ai response: ${JSON.stringify(result.data ?? result).slice(0, 200)}`);
  return url;
}

async function compressToWebp(buffer) {
  const sharp = await sharpLib();
  return sharp(buffer)
    .resize(1024, 1024, { fit: 'cover' })
    .webp({ quality: 65, effort: 6, smartSubsample: true })
    .toBuffer();
}

async function generateBlogImages(slug, imagePrompts) {
  if (NO_IMAGES) {
    console.log(`   ⏭️  Skipping image generation (--no-images)`);
    return [];
  }
  if (!process.env.FAL_API_KEY) {
    console.warn(`   ⚠️  FAL_API_KEY not set; skipping image generation`);
    return [];
  }

  const outDir = path.join(PUBLIC_BASE, 'blog', slug);
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];
  for (let i = 0; i < imagePrompts.length; i++) {
    const { prompt, alt } = imagePrompts[i];
    const num = i + 1;
    const outPath = path.join(outDir, `${num}.webp`);
    const publicPath = `/blog/${slug}/${num}.webp`;
    try {
      console.log(`   🎨 Image ${num}/3: ${prompt.slice(0, 60)}...`);
      const url = await generateOneImage(prompt);
      const png = await downloadBuffer(url);
      const webp = await compressToWebp(png);
      fs.writeFileSync(outPath, webp);
      const sizeKb = (webp.length / 1024).toFixed(0);
      console.log(`      ✓ Saved ${publicPath} (${sizeKb} KB)`);
      results.push({ num, publicPath, alt: alt || `Image ${num}` });
    } catch (e) {
      console.warn(`      ❌ Image ${num} failed: ${e.message}`);
      results.push({ num, publicPath: null, alt: alt || `Image ${num}` });
    }
  }
  return results;
}

function injectImagesIntoBody(body, imageResults) {
  let out = body;
  for (const img of imageResults) {
    const placeholder = new RegExp(`\\{\\{IMAGE_${img.num}\\}\\}`, 'g');
    if (img.publicPath) {
      const md = `![${img.alt}](${img.publicPath})`;
      out = out.replace(placeholder, md);
    } else {
      // Image generation failed, drop the placeholder
      out = out.replace(placeholder, '');
    }
  }
  // Clean up any double blank lines created by removed placeholders
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

// ─── Update CSV row(s) for a slug ───────────────────────────────────────────
function markRowsGenerated(rows, slug) {
  for (const r of rows) if (r.slug === slug && r.status === 'pending') r.status = 'generated';
}

// ─── Git helpers ────────────────────────────────────────────────────────────
function git(cmd, opts = {}) {
  return execSync(`git ${cmd}`, { cwd: ROOT, stdio: opts.silent ? 'pipe' : 'inherit', encoding: 'utf-8' });
}

function getCurrentBranch() {
  return git('rev-parse --abbrev-ref HEAD', { silent: true }).trim();
}

function makeBranchName() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  return `content/batch-${stamp}`;
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not set. Add it to scripts/.env.local or .env.local');
    process.exit(1);
  }
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌ keywords.csv not found at ${CSV_PATH}`);
    console.error('   Run: node scripts/expand-clusters.mjs');
    process.exit(1);
  }

  const rows = loadCsvAsObjects();
  const pending = getPendingPages(rows);

  if (!pending.length) {
    console.log('✅ Nothing pending to generate. All caught up!');
    return;
  }

  const batch = pending.slice(0, COUNT);
  console.log(`\n📦 Generating ${batch.length} page(s) (of ${pending.length} pending):`);
  for (const p of batch) {
    console.log(`   - [${p.page_type.padEnd(8)}] phase ${p.phase}  /${p.slug}  (${p.primary_keyword}, vol ${p.primary_volume})`);
  }
  console.log();

  const startBranch = getCurrentBranch();
  let branch = startBranch;

  if (!DRY_RUN && !AUTO) {
    branch = makeBranchName();
    console.log(`🌿 Creating branch: ${branch}`);
    try {
      git(`checkout -b ${branch}`);
    } catch (e) {
      console.error(`⚠️  Could not create branch (continuing on ${startBranch}):`, e.message);
      branch = startBranch;
    }
  }

  const generated = [];
  for (let i = 0; i < batch.length; i++) {
    const page = batch[i];
    console.log(`\n[${i + 1}/${batch.length}] Generating /${page.slug} (${page.page_type})...`);
    try {
      const data = await generatePage(page);
      console.log(`   ✓ Title: ${data.title || data.h1 || data.term}`);

      if (!DRY_RUN) {
        const outPath = await SAVERS[page.page_type](page, data);
        markRowsGenerated(rows, page.slug);
        console.log(`   ✓ Saved: ${path.relative(ROOT, outPath)}`);
        generated.push({ page, outPath });
      } else {
        console.log(`   (dry-run, not saving)`);
      }
    } catch (e) {
      console.error(`   ❌ Failed: ${e.message}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🧪 Dry run complete. No files written.');
    return;
  }

  if (!generated.length) {
    console.log('\n⚠️  Nothing generated successfully. Skipping commit.');
    return;
  }

  // Update CSV
  writeCsvFromObjects(rows);
  console.log(`\n💾 Updated ${path.relative(ROOT, CSV_PATH)}`);

  // Commit
  try {
    git('add apps/marketing/src/content apps/marketing/src/data/keywords.csv');
    if (fs.existsSync(path.join(ROOT, 'apps/marketing/public/blog'))) {
      git('add apps/marketing/public/blog');
    }
    if (fs.existsSync(path.join(ROOT, 'apps/marketing/public/tools'))) {
      git('add apps/marketing/public/tools');
    }
    const summary = generated.map(g => `- ${g.page.page_type}: ${g.page.slug}`).join('\n');
    const commitMsg = `content: generate ${generated.length} page${generated.length > 1 ? 's' : ''}\n\n${summary}`;
    fs.writeFileSync(path.join(ROOT, '.commit-msg.tmp'), commitMsg);
    execSync(`git commit -F .commit-msg.tmp`, { cwd: ROOT, stdio: 'inherit' });
    fs.unlinkSync(path.join(ROOT, '.commit-msg.tmp'));
    console.log(`\n✅ Committed ${generated.length} page(s) to ${branch}`);

    if (!AUTO && branch !== startBranch) {
      console.log(`\n📤 Pushing branch...`);
      try {
        git(`push -u origin ${branch}`);
        console.log(`\n🎉 Done! Open a PR to review:`);
        console.log(`   https://github.com/Eliasfied/looksmaxxing-web/pull/new/${branch}`);
      } catch (e) {
        console.warn(`\n⚠️  Push failed (commit is local): ${e.message}`);
      }
    } else if (AUTO) {
      console.log(`\n📤 Pushing to main...`);
      try { git(`push origin ${branch}`); console.log(`✅ Pushed to ${branch}`); }
      catch (e) { console.warn(`⚠️  Push failed: ${e.message}`); }
    }
  } catch (e) {
    console.error(`\n❌ Git commit failed: ${e.message}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
