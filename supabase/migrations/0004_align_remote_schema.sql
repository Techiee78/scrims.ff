-- ============================================================
-- 0004 — Align the connected Supabase project with the app.
-- Adds the tables and columns the backend functions expect.
-- Safe to run more than once (all statements are idempotent).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- shared helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================
-- legacy required field: the app uses ff_uid instead, and a NOT NULL unique
-- freefire_uid made the sign-up trigger fail for every new user
alter table public.profiles alter column freefire_uid drop not null;
alter table public.profiles drop constraint if exists profiles_freefire_uid_key;
alter table public.profiles alter column name drop not null;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists ff_ign text;
alter table public.profiles add column if not exists ff_uid text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- backfill from Supabase Auth
update public.profiles p
set email = coalesce(p.email, u.email),
    full_name = coalesce(nullif(p.full_name, ''), nullif(p.name, ''), u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
where u.id = p.id;

insert into public.profiles (id, email, full_name, name)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''),
       coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (id) do nothing;

-- keep profiles in sync for every new sign-up (email or OAuth)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- tournaments
-- ============================================================
-- the old schema only allowed solo/duo/squad; the app uses "Full Map" / "CS"
alter table public.tournaments drop constraint if exists tournaments_mode_check;

alter table public.tournaments add column if not exists team_type text not null default 'Solo';
alter table public.tournaments add column if not exists map text;
alter table public.tournaments add column if not exists per_kill numeric not null default 0;
alter table public.tournaments add column if not exists match_time timestamptz;
alter table public.tournaments add column if not exists total_slots int not null default 48;
alter table public.tournaments add column if not exists filled_slots int not null default 0;
alter table public.tournaments add column if not exists room_id text;
alter table public.tournaments add column if not exists room_password text;
alter table public.tournaments add column if not exists featured boolean not null default false;
alter table public.tournaments add column if not exists updated_at timestamptz not null default now();

-- carry over values from the older column names
update public.tournaments set total_slots = max_slots where max_slots is not null and max_slots > 0;
update public.tournaments set match_time = start_time where match_time is null and start_time is not null;
update public.tournaments set map = map_name where map is null and map_name is not null;

drop trigger if exists tournaments_updated_at on public.tournaments;
create trigger tournaments_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();

alter table public.tournaments enable row level security;

-- ============================================================
-- registrations
-- ============================================================
alter table public.registrations add column if not exists tournament_title text;
alter table public.registrations add column if not exists mode text;
alter table public.registrations add column if not exists user_email text;
alter table public.registrations add column if not exists user_name text;
alter table public.registrations add column if not exists ff_ign text;
alter table public.registrations add column if not exists ff_uid text;
alter table public.registrations add column if not exists teammates text[] not null default '{}';
alter table public.registrations add column if not exists slot_number int;
alter table public.registrations add column if not exists entry_fee numeric not null default 0;
alter table public.registrations add column if not exists played boolean not null default false;
alter table public.registrations add column if not exists placement int;
alter table public.registrations add column if not exists kills int not null default 0;
alter table public.registrations add column if not exists standings_screenshot text;
alter table public.registrations add column if not exists updated_at timestamptz not null default now();

create index if not exists registrations_user_email_idx on public.registrations(user_email);
create index if not exists registrations_tournament_idx on public.registrations(tournament_id);

drop trigger if exists registrations_updated_at on public.registrations;
create trigger registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();

alter table public.registrations enable row level security;

-- ============================================================
-- wallets
-- ============================================================
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_email text unique,
  balance numeric not null default 0,
  total_won numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wallets_user_email_idx on public.wallets(user_email);

drop trigger if exists wallets_updated_at on public.wallets;
create trigger wallets_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

alter table public.wallets enable row level security;

-- ============================================================
-- wallet_transactions
-- ============================================================
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  type text not null default 'debit',
  amount numeric not null default 0,
  label text,
  balance_after numeric,
  tournament_id bigint,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_email_idx on public.wallet_transactions(user_email);

alter table public.wallet_transactions enable row level security;

-- ============================================================
-- coin_topups
-- ============================================================
create table if not exists public.coin_topups (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  coins integer not null,
  amount_inr numeric not null,
  order_id text,
  payment_id text,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists coin_topups_user_email_idx on public.coin_topups(user_email);
create unique index if not exists coin_topups_order_id_idx on public.coin_topups(order_id);

drop trigger if exists coin_topups_updated_at on public.coin_topups;
create trigger coin_topups_updated_at before update on public.coin_topups
  for each row execute function public.set_updated_at();

alter table public.coin_topups enable row level security;

-- ============================================================
-- deletion_requests
-- ============================================================
create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.deletion_requests enable row level security;

-- Data tables are reached only through backend functions (service_role),
-- so RLS stays enabled with no policies; profiles keeps its own-row policies.