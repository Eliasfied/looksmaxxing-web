-- ============================================================
-- Credit Packs table
-- ============================================================
create table public.credit_packs (
  id                    text        primary key,  -- e.g. "credits_1000"
  revenuecat_product_id text        not null unique,
  credits               integer     not null,
  price_usd             numeric(10, 2) not null,
  is_active             boolean     not null default true
);

comment on table public.credit_packs is 'One-time credit pack purchases. Used by the RevenueCat NON_SUBSCRIPTION_PURCHASE webhook to resolve credit amounts.';

-- RLS: public read for active packs
alter table public.credit_packs enable row level security;

create policy "credit_packs: public select active"
  on public.credit_packs for select
  using (is_active = true);

-- Seed data goes in seed.example.sql / seed.sql
