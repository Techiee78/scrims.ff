-- ============================================================
-- Scrims.ff — Supabase schema migration (run once in SQL Editor)
-- Dashboard > SQL Editor > New query > paste > Run
-- After running, make yourself admin:
--   update public.profiles set role = 'admin' where email = 'YOU@EMAIL';
-- ============================================================

-- ---------- 1. PROFILES (linked to auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  ff_ign text,
  ff_uid text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 2. TOURNAMENTS ----------
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

-- ---------- 3. REGISTRATIONS ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
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

-- ---------- 4. WALLETS ----------
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text unique,
  balance numeric not null default 0,
  total_won numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 5. WALLET TRANSACTIONS ----------
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  type text not null default 'debit',
  amount numeric not null default 0,
  label text,
  balance_after numeric,
  tournament_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- 6. DELETION REQUESTS ----------
create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------- updated_at triggers ----------
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
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.registrations enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.deletion_requests enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

-- profiles
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- tournaments (read all; write admin)
drop policy if exists tournaments_read on public.tournaments;
create policy tournaments_read on public.tournaments for select using (true);
drop policy if exists tournaments_write_admin on public.tournaments;
create policy tournaments_write_admin on public.tournaments
  for all using (public.is_admin()) with check (public.is_admin());

-- registrations
drop policy if exists registrations_read on public.registrations;
create policy registrations_read on public.registrations
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists registrations_insert_self on public.registrations;
create policy registrations_insert_self on public.registrations
  for insert with check (user_id = auth.uid());
drop policy if exists registrations_update_admin on public.registrations;
create policy registrations_update_admin on public.registrations
  for update using (public.is_admin()) with check (public.is_admin());

-- wallets
drop policy if exists wallets_read on public.wallets;
create policy wallets_read on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists wallets_admin_write on public.wallets;
create policy wallets_admin_write on public.wallets
  for all using (public.is_admin()) with check (public.is_admin());

-- wallet_transactions
drop policy if exists wt_read on public.wallet_transactions;
create policy wt_read on public.wallet_transactions
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists wt_admin_write on public.wallet_transactions;
create policy wt_admin_write on public.wallet_transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- deletion_requests
drop policy if exists dr_read on public.deletion_requests;
create policy dr_read on public.deletion_requests
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists dr_insert_self on public.deletion_requests;
create policy dr_insert_self on public.deletion_requests
  for insert with check (user_id = auth.uid());

-- ============================================================
-- STORAGE (private bucket for standings screenshots)
-- ============================================================
insert into storage.buckets (id, name, public) values ('standings','standings', false)
  on conflict (id) do nothing;

drop policy if exists standings_upload_self on storage.objects;
create policy standings_upload_self on storage.objects
  for insert to authenticated
  with check (bucket_id = 'standings' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists standings_read on storage.objects;
create policy standings_read on storage.objects
  for select to authenticated
  using (bucket_id = 'standings' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists standings_update_self on storage.objects;
create policy standings_update_self on storage.objects
  for update to authenticated
  using (bucket_id = 'standings' and (storage.foldername(name))[1] = auth.uid()::text);

-- NOTE: To make yourself admin after running this:
--   update public.profiles set role = 'admin' where email = 'YOU@EMAIL';