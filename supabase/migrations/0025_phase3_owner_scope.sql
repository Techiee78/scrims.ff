-- ============================================================
-- Phase 3 — ownership scope on immutable user ids.
--
-- Every personal record now resolves its owner from the authenticated
-- auth.users id, never from an email string. This migration only backfills the
-- user_id columns for rows written before that rule (they are matched to the
-- profile that owns the address) and then makes the invariant stick for the
-- saved-teammate roster.
--
-- Safe to run more than once. Nothing is deleted or rewritten beyond filling a
-- null owner.
-- ============================================================

-- 1. Backfill the owner where it is missing -------------------
update public.teammates t
   set user_id = p.id
  from public.profiles p
 where t.user_id is null
   and p.email = t.user_email;

update public.registrations r
   set user_id = p.id
  from public.profiles p
 where r.user_id is null
   and p.email = r.user_email;

update public.wallet_transactions w
   set user_id = p.id
  from public.profiles p
 where w.user_id is null
   and p.email = w.user_email;

update public.coin_topups c
   set user_id = p.id
  from public.profiles p
 where c.user_id is null
   and p.email = c.user_email;

update public.wallets w
   set user_id = p.id
  from public.profiles p
 where w.user_id is null
   and p.email = w.user_email;

-- 2. Owner lookups are indexed ---------------------------------
create index if not exists teammates_user_id_idx on public.teammates(user_id);
create index if not exists wallet_transactions_user_id_idx on public.wallet_transactions(user_id);

-- 3. A saved teammate must always carry its owner ---------------
-- Only applied when no row is left without one, so the migration can never fail
-- on a project that still has unmatched legacy rows.
do $$
begin
  if not exists (select 1 from public.teammates where user_id is null) then
    execute 'alter table public.teammates alter column user_id set not null';
  end if;
end $$;

-- 4. teammates stays closed to the browser ---------------------
-- RLS is on with no policy, so only the service-role Edge Function
-- (manageTeammates) can read or write it. Restated here so a future policy added
-- by hand cannot quietly re-open an email-based path.
alter table public.teammates enable row level security;