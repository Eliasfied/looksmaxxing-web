import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ─── Blog Posts (long-form articles, 1500-3000 words) ───────────────────────
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    primary_keyword: z.string(),
    cluster: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    readingTime: z.number().optional(),
    related: z.array(z.string()).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

// ─── Tools (short landing pages with strong app CTA) ────────────────────────
const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    primary_keyword: z.string(),
    cluster: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    h1: z.string(),
    subtitle: z.string(),
    cta_label: z.string().default('Open the App'),
    badge: z.string().optional(),
    benefits: z.array(z.object({
      icon: z.string(),
      title: z.string(),
      description: z.string(),
    })).default([]),
    steps: z.array(z.object({
      step: z.number(),
      title: z.string(),
      description: z.string(),
    })).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    related: z.array(z.string()).default([]),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// ─── Glossary (short slang/term definitions, 200-500 words) ─────────────────
const glossary = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/glossary' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    term: z.string(),
    abbreviation: z.string().optional(),
    primary_keyword: z.string(),
    cluster: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    short_definition: z.string(),
    related_terms: z.array(z.string()).default([]),
    examples: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, tools, glossary };
