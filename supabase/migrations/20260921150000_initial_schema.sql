create extension if not exists "pgcrypto";

create type public.campaign_status as enum ('DRAFT', 'ACTIVE', 'EXPIRED', 'ARCHIVED');
create type public.mission_type as enum ('FOLLOW', 'LIKE_REPOST', 'COMMENT');
create type public.comment_proof_status as enum ('PENDING', 'APPROVED', 'REJECTED');
create type public.point_transaction_type as enum ('MISSION_REWARD', 'ADMIN_ADJUSTMENT', 'TICKET_CONVERSION');
create type public.ticket_transaction_type as enum ('REFERRAL_REWARD', 'POINT_CONVERSION', 'RAFFLE_ENTRY', 'ADMIN_ADJUSTMENT');
create type public.referral_status as enum ('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED');
create type public.raffle_status as enum ('DRAFT', 'OPEN', 'CLOSED', 'DRAWN');
create type public.wallet_claim_status as enum ('SUBMITTED', 'APPROVED', 'REJECTED');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text,
  display_name text,
  avatar_url text,
  points_balance integer not null default 0 check (points_balance >= 0),
  ticket_balance integer not null default 0 check (ticket_balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.x_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  x_user_id text not null unique,
  username text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  x_post_url text not null,
  status public.campaign_status not null default 'DRAFT',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_title_not_blank check (length(btrim(title)) > 0),
  constraint campaigns_x_post_url_is_x check (x_post_url ~* '^https://(www\.)?(x|twitter)\.com/.+')
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  type public.mission_type not null,
  title text not null,
  description text,
  reward_points integer not null default 5 check (reward_points = 5),
  target_url text,
  is_permanent boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint missions_title_not_blank check (length(btrim(title)) > 0),
  constraint missions_permanent_shape check (
    (type = 'FOLLOW' and is_permanent = true and campaign_id is null)
    or
    (type in ('LIKE_REPOST', 'COMMENT') and is_permanent = false and campaign_id is not null)
  ),
  constraint missions_target_url_is_x check (
    target_url is null
    or target_url ~* '^https://(www\.)?(x|twitter)\.com/.+'
  )
);

create unique index missions_one_permanent_follow
  on public.missions (type)
  where type = 'FOLLOW' and is_permanent = true;

create unique index missions_one_type_per_campaign
  on public.missions (campaign_id, type)
  where campaign_id is not null;

create table public.mission_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint mission_completions_unique_user_mission unique (user_id, mission_id)
);

create index mission_completions_user_id_idx on public.mission_completions (user_id);
create index mission_completions_campaign_id_idx on public.mission_completions (campaign_id);

create table public.comment_proofs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete restrict,
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  comment_url text not null,
  status public.comment_proof_status not null default 'PENDING',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_proofs_comment_url_is_x check (comment_url ~* '^https://(www\.)?(x|twitter)\.com/.+'),
  constraint comment_proofs_review_fields check (
    (status = 'PENDING' and reviewed_by is null and reviewed_at is null)
    or
    (status in ('APPROVED', 'REJECTED') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index comment_proofs_user_id_idx on public.comment_proofs (user_id);
create index comment_proofs_status_idx on public.comment_proofs (status);
create unique index comment_proofs_one_approved_per_user_mission
  on public.comment_proofs (user_id, mission_id)
  where status = 'APPROVED';

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  type public.point_transaction_type not null,
  source text not null,
  mission_id uuid references public.missions(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint point_transactions_source_not_blank check (length(btrim(source)) > 0),
  constraint point_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index point_transactions_user_id_created_at_idx
  on public.point_transactions (user_id, created_at desc);
create unique index point_transactions_one_mission_reward
  on public.point_transactions (user_id, mission_id)
  where type = 'MISSION_REWARD' and mission_id is not null;

create table public.ticket_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  type public.ticket_transaction_type not null,
  source text not null,
  raffle_id uuid,
  referral_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ticket_transactions_source_not_blank check (length(btrim(source)) > 0),
  constraint ticket_transactions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index ticket_transactions_user_id_created_at_idx
  on public.ticket_transactions (user_id, created_at desc);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_codes_code_shape check (code ~ '^[A-Z0-9][A-Z0-9_-]{3,31}$')
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  status public.referral_status not null default 'PENDING',
  qualified_at timestamptz,
  rewarded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referrals_no_self_referral check (referrer_user_id <> referred_user_id),
  constraint referrals_qualification_fields check (
    (status in ('PENDING', 'REJECTED') and qualified_at is null and rewarded_at is null)
    or
    (status = 'QUALIFIED' and qualified_at is not null and rewarded_at is null)
    or
    (status = 'REWARDED' and qualified_at is not null and rewarded_at is not null)
  )
);

alter table public.ticket_transactions
  add constraint ticket_transactions_referral_fk
  foreign key (referral_id) references public.referrals(id) on delete restrict;

create unique index ticket_transactions_one_referral_reward
  on public.ticket_transactions (referral_id)
  where type = 'REFERRAL_REWARD' and referral_id is not null;

create index referrals_referrer_user_id_idx on public.referrals (referrer_user_id);
create index referrals_status_idx on public.referrals (status);

create table public.raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  access_code text not null unique,
  wl_spots integer not null check (wl_spots > 0),
  status public.raffle_status not null default 'DRAFT',
  starts_at timestamptz,
  ends_at timestamptz,
  closed_at timestamptz,
  drawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint raffles_title_not_blank check (length(btrim(title)) > 0),
  constraint raffles_access_code_shape check (access_code ~ '^[A-Z0-9][A-Z0-9_-]{3,63}$'),
  constraint raffles_lifecycle_timestamps check (
    (status in ('DRAFT', 'OPEN') and closed_at is null and drawn_at is null)
    or
    (status = 'CLOSED' and closed_at is not null and drawn_at is null)
    or
    (status = 'DRAWN' and closed_at is not null and drawn_at is not null)
  )
);

alter table public.ticket_transactions
  add constraint ticket_transactions_raffle_fk
  foreign key (raffle_id) references public.raffles(id) on delete restrict;

create table public.raffle_entries (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_index integer not null check (entry_index > 0),
  source_ticket_transaction_id uuid references public.ticket_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint raffle_entries_unique_user_entry unique (raffle_id, user_id, entry_index)
);

create index raffle_entries_raffle_id_idx on public.raffle_entries (raffle_id);
create index raffle_entries_user_id_idx on public.raffle_entries (user_id);

create table public.raffle_winners (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  entry_id uuid not null unique references public.raffle_entries(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  winner_position integer not null check (winner_position > 0),
  created_at timestamptz not null default now(),
  constraint raffle_winners_unique_position unique (raffle_id, winner_position),
  constraint raffle_winners_unique_user unique (raffle_id, user_id)
);

create index raffle_winners_user_id_idx on public.raffle_winners (user_id);

create table public.wallet_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  winner_id uuid not null unique references public.raffle_winners(id) on delete restrict,
  wallet_address text not null,
  status public.wallet_claim_status not null default 'SUBMITTED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_claims_one_per_user_raffle unique (user_id, raffle_id),
  constraint wallet_claims_wallet_not_blank check (length(btrim(wallet_address)) > 0)
);

create index wallet_claims_user_id_idx on public.wallet_claims (user_id);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_logs_action_not_blank check (length(btrim(action)) > 0),
  constraint admin_audit_logs_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint admin_audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger x_accounts_set_updated_at
  before update on public.x_accounts
  for each row execute function public.set_updated_at();

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

create trigger missions_set_updated_at
  before update on public.missions
  for each row execute function public.set_updated_at();

create trigger comment_proofs_set_updated_at
  before update on public.comment_proofs
  for each row execute function public.set_updated_at();

create trigger referral_codes_set_updated_at
  before update on public.referral_codes
  for each row execute function public.set_updated_at();

create trigger raffles_set_updated_at
  before update on public.raffles
  for each row execute function public.set_updated_at();

create trigger wallet_claims_set_updated_at
  before update on public.wallet_claims
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.x_accounts enable row level security;
alter table public.campaigns enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.comment_proofs enable row level security;
alter table public.point_transactions enable row level security;
alter table public.ticket_transactions enable row level security;
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.raffles enable row level security;
alter table public.raffle_entries enable row level security;
alter table public.raffle_winners enable row level security;
alter table public.wallet_claims enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "profiles owner read"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_admin());

create policy "x_accounts owner read"
  on public.x_accounts for select
  using (auth.uid() = user_id or public.is_admin());

create policy "campaigns active public read"
  on public.campaigns for select
  using (status = 'ACTIVE' or public.is_admin());

create policy "missions active public read"
  on public.missions for select
  using (is_active = true or public.is_admin());

create policy "mission_completions owner read"
  on public.mission_completions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "comment_proofs owner read"
  on public.comment_proofs for select
  using (auth.uid() = user_id or public.is_admin());

create policy "comment_proofs owner pending insert"
  on public.comment_proofs for insert
  with check (
    auth.uid() = user_id
    and status = 'PENDING'
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "point_transactions owner read"
  on public.point_transactions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "ticket_transactions owner read"
  on public.ticket_transactions for select
  using (auth.uid() = user_id or public.is_admin());

create policy "referral_codes owner read"
  on public.referral_codes for select
  using (auth.uid() = user_id or public.is_admin());

create policy "referrals participant read"
  on public.referrals for select
  using (
    auth.uid() = referrer_user_id
    or auth.uid() = referred_user_id
    or public.is_admin()
  );

create policy "raffles open public read"
  on public.raffles for select
  using (status in ('OPEN', 'CLOSED', 'DRAWN') or public.is_admin());

create policy "raffle_entries owner read"
  on public.raffle_entries for select
  using (auth.uid() = user_id or public.is_admin());

create policy "raffle_winners public drawn read"
  on public.raffle_winners for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.raffles
      where raffles.id = raffle_winners.raffle_id
        and raffles.status = 'DRAWN'
    )
  );

create policy "wallet_claims owner read"
  on public.wallet_claims for select
  using (auth.uid() = user_id or public.is_admin());

create policy "wallet_claims winner insert"
  on public.wallet_claims for insert
  with check (
    auth.uid() = user_id
    and status = 'SUBMITTED'
    and exists (
      select 1
      from public.raffle_winners
      where raffle_winners.id = wallet_claims.winner_id
        and raffle_winners.user_id = auth.uid()
        and raffle_winners.raffle_id = wallet_claims.raffle_id
    )
  );

create policy "admin_audit_logs admin read"
  on public.admin_audit_logs for select
  using (public.is_admin());

create policy "admin full access profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access x_accounts"
  on public.x_accounts for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access campaigns"
  on public.campaigns for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access missions"
  on public.missions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access mission_completions"
  on public.mission_completions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access comment_proofs"
  on public.comment_proofs for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access point_transactions"
  on public.point_transactions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access ticket_transactions"
  on public.ticket_transactions for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access referral_codes"
  on public.referral_codes for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access referrals"
  on public.referrals for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access raffles"
  on public.raffles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access raffle_entries"
  on public.raffle_entries for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access raffle_winners"
  on public.raffle_winners for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access wallet_claims"
  on public.wallet_claims for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin full access admin_audit_logs"
  on public.admin_audit_logs for all
  using (public.is_admin())
  with check (public.is_admin());
