-- ============================================================
-- SaaS Template – Initial Schema
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles
-- ============================================================
create table public.profiles (
  id          uuid        primary key references auth.users on delete cascade,
  email       text        not null,
  display_name text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile data, mirrors auth.users';

-- ============================================================
-- 2. credits
-- ============================================================
create table public.credits (
  id                             uuid        primary key default uuid_generate_v4(),
  user_id                        uuid        not null unique references public.profiles on delete cascade,
  subscription_credits           integer     not null default 0 check (subscription_credits >= 0),
  topup_credits                  integer     not null default 0 check (topup_credits >= 0),
  total_credits                  integer     generated always as (subscription_credits + topup_credits) stored,
  subscription_credits_reset_at  timestamptz,
  updated_at                     timestamptz not null default now()
);

comment on table public.credits is 'Per-user credit balances. subscription_credits reset on renewal; topup_credits never expire.';
comment on column public.credits.total_credits is 'Computed: subscription_credits + topup_credits';

-- ============================================================
-- 3. credit_transactions
-- ============================================================
create table public.credit_transactions (
  id                       uuid        primary key default uuid_generate_v4(),
  user_id                  uuid        not null references public.profiles on delete cascade,
  amount                   integer     not null,
  credit_type              text        not null check (credit_type in ('subscription', 'topup')),
  balance_after_subscription integer,
  balance_after_topup       integer,
  type                     text        not null check (type in (
                             'subscription_grant',
                             'subscription_reset',
                             'topup_purchase',
                             'generation_used',
                             'bonus',
                             'refund'
                           )),
  description              text,
  reference_id             text,       -- RevenueCat transaction ID or similar
  created_at               timestamptz not null default now()
);

comment on table public.credit_transactions is 'Immutable ledger of all credit changes';
comment on column public.credit_transactions.reference_id is 'External ID, e.g. RevenueCat transaction ID';

create index credit_transactions_user_id_idx on public.credit_transactions (user_id, created_at desc);

-- ============================================================
-- 4. plans
-- ============================================================
create table public.plans (
  id                   text        primary key,  -- e.g. "starter_monthly"
  plan                 text        not null check (plan in ('starter', 'pro', 'max', 'ultra')),
  interval             text        not null check (interval in ('monthly', 'yearly')),
  name                 text        not null,
  monthly_credits      integer     not null,
  price_usd            numeric(10, 2) not null,
  revenuecat_product_id text,
  is_active            boolean     not null default true,
  features             jsonb       not null default '[]'
);

comment on table public.plans is 'Available subscription plans. Seed data only – do not mutate from app code.';

-- ============================================================
-- 5. subscriptions
-- ============================================================
create table public.subscriptions (
  id                       uuid        primary key default uuid_generate_v4(),
  user_id                  uuid        not null unique references public.profiles on delete cascade,
  plan_id                  text        not null references public.plans,
  revenuecat_customer_id   text,
  status                   text        not null check (status in ('active', 'cancelled', 'expired', 'paused', 'trial')),
  monthly_credit_allowance integer     not null,  -- snapshot from plan at purchase time
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean     not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

comment on table public.subscriptions is 'Max one active subscription per user (enforced by unique on user_id)';
comment on column public.subscriptions.monthly_credit_allowance is 'Snapshot of plan.monthly_credits at purchase time; survives plan price changes';

-- ============================================================
-- 6. ai_models
-- ============================================================
create table public.ai_models (
  id           text        primary key,  -- e.g. "flux-schnell"
  name         text        not null,
  provider     text        not null,     -- "fal.ai"
  fal_model_id text        not null,     -- "fal-ai/flux/schnell"
  credit_cost  integer     not null,
  is_active    boolean     not null default true,
  sort_order   integer     not null default 0,
  settings     jsonb       not null default '{}'
);

comment on table public.ai_models is 'Available AI image generation models and their credit costs';

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger credits_updated_at
  before update on public.credits
  for each row execute function public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS – enable on all tables
-- ============================================================
alter table public.profiles           enable row level security;
alter table public.credits            enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.plans              enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.ai_models          enable row level security;

-- profiles
create policy "profiles: own row select"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- credits
create policy "credits: own row select"
  on public.credits for select
  using (auth.uid() = user_id);

-- credit_transactions
create policy "credit_transactions: own rows select"
  on public.credit_transactions for select
  using (auth.uid() = user_id);

-- subscriptions
create policy "subscriptions: own row select"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- plans (public read for active plans)
create policy "plans: public select active"
  on public.plans for select
  using (is_active = true);

-- ai_models (public read for active models)
create policy "ai_models: public select active"
  on public.ai_models for select
  using (is_active = true);

-- Note: service role bypasses RLS automatically in Supabase.
-- Webhook handlers (RevenueCat) must use the service role key.

-- ============================================================
-- Trigger: handle_new_user
-- Fires on auth.users insert → creates profile + credits row
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _display_name text;
begin
  -- Derive display_name: prefer metadata, fall back to email prefix
  _display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  -- 1. Create profile
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, _display_name);

  -- 2. Create credits row (no free tier by default)
  insert into public.credits (user_id, subscription_credits, topup_credits)
  values (new.id, 0, 0);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
