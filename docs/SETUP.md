# Setup Checklist

Complete these steps after creating a new project from this template.

---

## 1. Brand Config

- [ ] Copy `config/app.config.example.ts` to `config/app.config.ts`
- [ ] Fill in all fields: `brand`, `seo`, `theme`, `pricing`, `aiModels`
- [ ] Add `config/app.config.ts` to `.gitignore` if it contains secrets (it shouldn't — secrets go in `.env.local`)

---

## 2. Supabase

- [ ] Create a new project at [supabase.com](https://supabase.com)
- [ ] Run `supabase link --project-ref YOUR_PROJECT_REF`
- [ ] Apply migrations: `supabase db push`
- [ ] Create `supabase/seed.sql` (copy from `supabase/seed.example.sql`, fill in your plans/models/packs)
- [ ] Run seed: `supabase db reset` or run seed.sql manually in the SQL editor
- [ ] Generate types: `pnpm db:types`
- [ ] Enable Google OAuth in Supabase Auth settings (optional but recommended)
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL` and keys to `.env.local`

---

## 3. RevenueCat

- [ ] Create a new project in [RevenueCat dashboard](https://app.revenuecat.com)
- [ ] Connect Stripe as payment provider (Web Billing)
- [ ] Create products in Stripe matching your `appConfig.pricing` plan IDs
- [ ] Create offerings and packages in RevenueCat pointing to those Stripe products
- [ ] Set webhook URL: `https://app.YOURDOMAIN.com/api/webhooks/revenuecat`
- [ ] Copy `NEXT_PUBLIC_REVENUECAT_API_KEY` and `REVENUECAT_WEBHOOK_SECRET` to `.env.local`

**RevenueCat product ID naming convention:**
`{yourapp}_{plan}_{interval}` — e.g. `myapp_starter_monthly`

---

## 4. fal.ai (AI generation)

- [ ] Create account at [fal.ai](https://fal.ai)
- [ ] Get API key and add to `.env.local` as `FAL_API_KEY`
- [ ] Add your models to `appConfig.aiModels` and to the `ai_models` DB table (via seed.sql)
- [ ] Update `apps/web/app/(tool)/` with your actual tool logic

---

## 5. Anthropic (pSEO generator)

- [ ] Get API key from [console.anthropic.com](https://console.anthropic.com)
- [ ] Add to `.env.local` as `ANTHROPIC_API_KEY`
- [ ] Customize `scripts/pseo-generator.mjs` prompt for your niche
- [ ] Test: `pnpm pseo:generate "your keyword here"`

---

## 6. Vercel

- [ ] Create 2 Vercel projects: one for `apps/web`, one for `apps/marketing`
- [ ] Set Root Directory in each project (`apps/web` / `apps/marketing`)
- [ ] Copy all env vars from `.env.local` to Vercel project settings
- [ ] Connect your domain (add to both projects or use subdomains)
- [ ] Trigger a deploy

---

## 7. PostHog Analytics

- [ ] Create project at [posthog.com](https://posthog.com)
- [ ] Copy `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.local`
- [ ] Define key events to track: Signup, Generate, Purchase, Pack-CTA-Click

---

## 8. Content

- [ ] Write homepage copy in `apps/marketing/src/pages/index.astro`
- [ ] Add real FAQs to `apps/marketing/src/data/faq.json`
- [ ] Update privacy policy and terms in `apps/marketing/src/pages/privacy.astro` + `terms.astro`
- [ ] Write About page
- [ ] Replace placeholder OG image `/public/og-default.png`
- [ ] Replace logo assets

---

## 9. Build your Tool

- [ ] Replace `apps/web/app/(tool)/placeholder.tsx` with your actual tool
- [ ] Wire up generation API in `apps/web/app/api/generate/`
- [ ] Add your AI model(s) to `appConfig.aiModels`

---

## 10. pSEO / Explore Pages

- [ ] Create `docs/keywords.md` with your target keyword list
- [ ] Customize pSEO prompt in `scripts/pseo-generator.mjs` for your niche
- [ ] Run `pnpm pseo:generate` for a few test keywords
- [ ] Review output quality, adjust prompt
- [ ] Set up automated generation (see Phase 14 in ARCHITECTURE.md)

---

## 11. IndexNow (Bing SEO)

- [ ] Get an IndexNow key at [bing.com/indexnow](https://www.bing.com/indexnow)
- [ ] Add verification file to `apps/marketing/public/{your-key}.txt`
- [ ] Add `INDEXNOW_KEY` to `.env.local`
- [ ] Run `pnpm indexnow` after each deploy

---

## 12. Google Search Console

- [ ] Add property for your domain (DNS TXT verification)
- [ ] Submit sitemap: `https://yourdomain.com/sitemap-index.xml`

---

## Done

At this point you should have a fully working SaaS with:
- Auth (email + Google OAuth)
- Credit-based AI generation
- Subscription + one-time purchase payments
- Marketing site with pSEO pages
- Analytics
