# SaaS Template

Generic SaaS starter with Auth, Credits, Payments, and pSEO automation.

**Stack:** Next.js 15 + Astro 6 + Supabase + RevenueCat + Tailwind v4

## Quick Start

See [docs/SETUP.md](docs/SETUP.md) for the full setup checklist after cloning.

## Structure

```
apps/
  web/        # Next.js 15 App Router (app.yourapp.com)
  marketing/  # Astro 6 static site (yourapp.com)
packages/
  shared/     # Shared types and utils
supabase/
  migrations/ # Database schema
scripts/
  pseo-generator.mjs  # pSEO page generator (Claude API)
  indexnow.mjs        # Bing IndexNow submission
config/
  app.config.example.ts  # Brand config template
docs/
  SETUP.md        # Post-clone setup checklist
  ARCHITECTURE.md # System architecture docs
```

## Architecture

- Auth: Supabase (Email + Google OAuth)
- Payments: RevenueCat Web Billing (backed by Stripe)
- Credits: Two-pool system (subscription + topup)
- pSEO: Claude API generates explore pages from keywords
- Analytics: PostHog
- Deployment: Vercel (2 projects: web + marketing)
