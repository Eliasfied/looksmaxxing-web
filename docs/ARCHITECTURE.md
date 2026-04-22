# Architecture

## Two-Pool Credit System

Users have two credit balances:

| Pool | Source | Expires? |
|---|---|---|
| `subscription_credits` | Monthly reset on RevenueCat renewal webhook | Yes, on next reset |
| `topup_credits` | One-time purchase | Never |

**Deduction order:** Subscription credits are spent first, then topup credits.

Each deduction is recorded in `credit_transactions` as `generation_used` with a `credit_type` field indicating which pool was drawn from.

### RevenueCat Webhook Flow

```
RevenueCat → POST /api/webhooks/revenuecat
  INITIAL_PURCHASE / RENEWAL → grant subscription_credits, reset to plan.monthly_credits
  NON_RENEWING_PURCHASE (credit pack) → add to topup_credits
  EXPIRATION → set subscription to inactive
```

The webhook uses the **service role key** to bypass Supabase RLS.

---

## Auth Flow

1. User signs up via email or Google OAuth (Supabase Auth)
2. Trigger `on_auth_user_created` creates `profiles` + `credits` rows
3. Middleware protects `/app/*` routes, redirects to `/login` if not authenticated
4. Settings page shows subscription status, credit balance, transaction history

No free credits on signup. Users must subscribe or purchase credits to generate.

---

## pSEO System

1. Keyword list in `docs/keywords.md`
2. `scripts/pseo-generator.mjs` calls Claude API with keyword + brand context
3. Claude generates a complete `explore-packs.json` entry (title, description, hero, faqs, etc.)
4. Script checks for near-duplicates against existing entries before appending
5. Optionally: fal.ai generates 6 images, `sharp` compresses to `.webp`
6. Commit + push → Vercel deploys automatically
7. Run `pnpm indexnow` to submit new URLs to Bing

Each pSEO page lives at `/explore/[slug]` on the marketing site.

### Cost per page
- Claude API: ~$0.01-0.03
- fal.ai images (6x): ~$0.12
- Total: ~$0.15/page

---

## Marketing Site (Astro)

- Static site, deployed to Vercel
- pSEO pages at `/explore/[slug]` from `src/data/explore-packs.json`
- Tool pages at `/tools/[tool-name]` (each tool is its own `.astro` file)
- FAQ uses native `<details>` accordion (no JS needed)
- All CTAs point to `appConfig.brand.appUrl`

**Important:** Tailwind v4 via `@tailwindcss/vite` (NOT `@astrojs/tailwind` — incompatible with Astro 6).

---

## Web App (Next.js 15)

- App Router with server components by default
- `app/(auth)/` — public auth pages
- `app/(app)/` — protected app pages (wrapped in auth check layout)
- `app/(tool)/` — your main tool (replace placeholder)
- `app/api/` — API routes (webhooks, generate, credits, auth)
- `app/onboarding/` — post-signup pricing + welcome flow

### Key Libraries
- `lib/supabase/` — Supabase client (browser + server + middleware)
- `lib/credits/` — credit deduction logic
- `lib/config.ts` — re-exports `appConfig` for use in the web app

---

## Database Schema

| Table | Purpose |
|---|---|
| `profiles` | Public user data, mirrors `auth.users` |
| `credits` | Per-user balance (subscription + topup pools) |
| `credit_transactions` | Immutable ledger for every credit change |
| `plans` | Subscription plan catalogue |
| `subscriptions` | One active subscription per user |
| `ai_models` | Model registry with credit cost |
| `credit_packs` | One-time purchase pack definitions |

---

## Deployment

Both apps deploy automatically on push to `main`:

- `apps/web` → Vercel project, domain `app.YOURDOMAIN.com`
- `apps/marketing` → Vercel project, domain `YOURDOMAIN.com`

Each has its own `vercel.json` with the correct build commands for the monorepo.
