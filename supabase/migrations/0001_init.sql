-- ============================================================
-- Scrims.ff — Supabase schema (data only; auth stays on Base44)
-- Run once in Supabase SQL Editor (Dashboard > SQL Editor).
-- All app access is via backend functions using the service_role
-- key, so RLS is enabled with NO policies (anon denied).
-- ============================================================

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  mode text not null default 'Full Map',
  team_type text not null default 'Solo',
  map text,
  entry_fee numeric not null default 0,
  prize_pool numeric not null default 0,
  per_kill numeric not null default 0,
  match_time timestamptz,
  total_slots int not null default 48,
  filled_slots int not null default 0,
  banner_url text,
  room_id text,
  room_password text,
  featured boolean not null default false,
  status text not null default 'upcoming',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  tournament_title text,
  mode text,
  user_email text,
  user_name text,
  ff_ign text,
  ff_uid text,
  teammates text[] not null default '{}',
  slot_number int,
  entry_fee numeric not null default 0,
  status text not null default 'joined',
  played boolean not null default false,
  placement int,
  kills int not null default 0,
  standings_screenshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_email text unique,
  balance numeric not null default 0,
  total_won numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  type text not null default 'debit',
  amount numeric not null default 0,
  label text,
  balance_after numeric,
  tournament_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists tournaments_updated_at on public.tournaments;
create trigger tournaments_updated_at before update on public.tournaments
  for each row execute function public.set_updated_at();
drop trigger if exists registrations_updated_at on public.registrations;
create trigger registrations_updated_at before update on public.registrations
  for each row execute function public.set_updated_at();
drop trigger if exists wallets_updated_at on public.wallets;
create trigger wallets_updated_at before update on public.wallets
  for each row execute function public.set_updated_at();

-- RLS: enable on all tables, NO policies => anon key denied; only the
-- service_role (used by backend functions) can read/write.
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.deletion_requests enable row level security;