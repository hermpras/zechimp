-- Migration: Phase 8 - Whitelist Claims and Wallet Locking
-- Creates public.wl_claim_status enum and public.wl_claims table

create type public.wl_claim_status as enum ('CLAIMABLE', 'CLAIMED', 'EXPIRED');

create table public.wl_claims (
  id uuid primary key default gen_random_uuid(),
  raffle_winner_id uuid not null unique references public.raffle_winners(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  wallet_address text not null default '',
  wallet_chain text not null default 'EVM',
  status public.wl_claim_status not null default 'CLAIMABLE',
  claim_deadline timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wl_claims_unique_user_raffle unique (user_id, raffle_id)
);

-- Add updated_at trigger
create trigger wl_claims_set_updated_at
  before update on public.wl_claims
  for each row execute function public.set_updated_at();

-- Enable Row Level Security
alter table public.wl_claims enable row level security;

-- Policies
create policy "wl_claims owner read"
  on public.wl_claims for select
  using (auth.uid() = user_id or public.is_admin());

create policy "wl_claims owner claim update"
  on public.wl_claims for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "admin full access wl_claims"
  on public.wl_claims for all
  using (public.is_admin())
  with check (public.is_admin());
