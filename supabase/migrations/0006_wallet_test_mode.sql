-- 0006 — Secure wallet access + TEST-MODE recharge
-- Non-destructive: only ADD COLUMN (nullable), ADD INDEX, ADD POLICY,
-- ADD TRIGGER and ADD FUNCTION. Existing balances/rows are never modified
-- except user_id being filled from a verified 1:1 email → auth.users match.
--
-- Ownership model after this migration:
--   * user_id (uuid → auth.users) is the ownership key used by RLS.
--   * user_email is kept (existing functions + legacy rows use it) and is
--     mapped to user_id by a trigger on every write.
--   * Clients get SELECT on their own rows only. There are NO client
--     INSERT/UPDATE/DELETE policies, so direct balance mutation is denied.
--   * All money movement goes through server-side Edge Functions calling the
--     SECURITY DEFINER RPCs below (service_role only).

begin;

-- 1. Ownership columns -------------------------------------------------------
alter table public.wallets
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.wallet_transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists topup_order_id text;

alter table public.coin_topups
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists mode text not null default 'live';

-- 2. Backfill from verified identities (exactly one auth user per email) -----
update public.wallets w set user_id = u.id
from auth.users u
where w.user_id is null
  and u.email is not null
  and lower(u.email) = lower(w.user_email)
  and (select count(*) from auth.users x where lower(x.email) = lower(w.user_email)) = 1;

update public.wallet_transactions t set user_id = u.id
from auth.users u
where t.user_id is null
  and u.email is not null
  and lower(u.email) = lower(t.user_email)
  and (select count(*) from auth.users x where lower(x.email) = lower(t.user_email)) = 1;

update public.coin_topups c set user_id = u.id
from auth.users u
where c.user_id is null
  and u.email is not null
  and lower(u.email) = lower(c.user_email)
  and (select count(*) from auth.users x where lower(x.email) = lower(c.user_email)) = 1;

-- 3. Keep user_id filled on every future write ------------------------------
create or replace function public.fill_money_user_id()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.user_id is null and new.user_email is not null then
    select u.id into new.user_id
    from auth.users u
    where lower(u.email) = lower(new.user_email)
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wallets_user_id on public.wallets;
create trigger trg_wallets_user_id before insert or update on public.wallets
  for each row execute function public.fill_money_user_id();

drop trigger if exists trg_wallet_transactions_user_id on public.wallet_transactions;
create trigger trg_wallet_transactions_user_id before insert or update on public.wallet_transactions
  for each row execute function public.fill_money_user_id();

drop trigger if exists trg_coin_topups_user_id on public.coin_topups;
create trigger trg_coin_topups_user_id before insert or update on public.coin_topups
  for each row execute function public.fill_money_user_id();

-- 4. Indexes + idempotency guard -------------------------------------------
create unique index if not exists wallets_user_id_key
  on public.wallets (user_id) where user_id is not null;

create index if not exists wallet_transactions_user_id_idx
  on public.wallet_transactions (user_id);

create index if not exists coin_topups_user_id_idx
  on public.coin_topups (user_id);

-- Hard guarantee: one order can produce at most one ledger credit, even if
-- two confirms race past the row lock.
create unique index if not exists wallet_transactions_topup_order_id_key
  on public.wallet_transactions (topup_order_id) where topup_order_id is not null;

-- 5. RLS — read own rows only; RLS stays ENABLED on all three tables -------
drop policy if exists "wallet_select_own" on public.wallets;
create policy "wallet_select_own" on public.wallets
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "wallet_transactions_select_own" on public.wallet_transactions;
create policy "wallet_transactions_select_own" on public.wallet_transactions
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "coin_topups_select_own" on public.coin_topups;
create policy "coin_topups_select_own" on public.coin_topups
  for select to authenticated using (auth.uid() = user_id);

-- 6. TEST-MODE RPCs (service_role only) ------------------------------------
-- 1 coin = 1 INR, stored as numeric(12,2). Integer coins only — no floats.

create or replace function public.wallet_test_topup_create(p_user_id uuid, p_coins integer)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_order text;
  v_id uuid;
  v_amount numeric(12,2);
begin
  if p_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_coins is null or p_coins < 10 or p_coins > 10000 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_amount := p_coins::numeric(12,2) * 1.00; -- 1 coin = ₹1
  v_order := 'test_' || replace(gen_random_uuid()::text, '-', '');

  insert into public.coin_topups (user_email, user_id, coins, amount_inr, order_id, status, mode)
  values (v_email, p_user_id, p_coins, v_amount, v_order, 'pending', 'test')
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id, 'orderId', v_order, 'coins', p_coins,
    'amountInr', v_amount, 'status', 'pending'
  );
end;
$$;

create or replace function public.wallet_test_topup_confirm(p_user_id uuid, p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_topup public.coin_topups%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance numeric(12,2);
begin
  if p_user_id is null or p_order_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  -- Lock the order row: concurrent confirms serialize here.
  select * into v_topup from public.coin_topups
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_topup.user_id is distinct from p_user_id then
    raise exception 'not_your_order' using errcode = '42501';
  end if;

  if v_topup.mode <> 'test' then
    raise exception 'not_a_test_order' using errcode = '22023';
  end if;

  if v_topup.coins is null or v_topup.amount_inr is null
     or v_topup.coins < 10 or v_topup.coins > 10000
     or v_topup.amount_inr <> v_topup.coins::numeric(12,2) * 1.00 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  -- Replay: already credited, nothing changes.
  if v_topup.status = 'paid' then
    return jsonb_build_object('credited', false, 'already', true,
      'coins', v_topup.coins, 'status', 'paid');
  end if;

  if v_topup.status not in ('created', 'pending') then
    raise exception 'invalid_order_state' using errcode = '22023';
  end if;

  -- Lock (or create) the wallet row for this user.
  select * into v_wallet from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    insert into public.wallets (user_email, user_id, balance, total_won)
    values (v_topup.user_email, p_user_id, 0, 0)
    returning * into v_wallet;
  end if;

  v_balance := coalesce(v_wallet.balance, 0) + v_topup.coins::numeric(12,2);

  update public.wallets
  set balance = v_balance, updated_at = now()
  where id = v_wallet.id;

  insert into public.wallet_transactions
    (user_email, user_id, type, amount, label, balance_after, topup_order_id)
  values
    (v_topup.user_email, p_user_id, 'credit', v_topup.coins,
     'Test top-up · ' || v_topup.coins || ' coins (test mode)', v_balance, p_order_id);

  update public.coin_topups
  set status = 'paid', payment_id = 'TEST-' || p_order_id, updated_at = now()
  where id = v_topup.id;

  return jsonb_build_object('credited', true, 'already', false,
    'coins', v_topup.coins, 'balance', v_balance, 'status', 'paid');
exception
  when unique_violation then
    -- Ledger already has a credit for this order (racing confirm): no-op.
    return jsonb_build_object('credited', false, 'already', true, 'status', 'paid');
end;
$$;

create or replace function public.wallet_test_topup_fail(p_user_id uuid, p_order_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_topup public.coin_topups%rowtype;
begin
  if p_user_id is null or p_order_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select * into v_topup from public.coin_topups
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_topup.user_id is distinct from p_user_id then
    raise exception 'not_your_order' using errcode = '42501';
  end if;
  if v_topup.mode <> 'test' then
    raise exception 'not_a_test_order' using errcode = '22023';
  end if;

  if v_topup.status = 'paid' then
    raise exception 'invalid_order_state' using errcode = '22023';
  end if;

  update public.coin_topups
  set status = 'failed', payment_id = 'TEST-FAILED-' || p_order_id, updated_at = now()
  where id = v_topup.id and status <> 'paid';

  return jsonb_build_object('credited', false, 'status', 'failed');
end;
$$;

revoke all on function public.wallet_test_topup_create(uuid, integer) from public, anon, authenticated;
revoke all on function public.wallet_test_topup_confirm(uuid, text) from public, anon, authenticated;
revoke all on function public.wallet_test_topup_fail(uuid, text) from public, anon, authenticated;

grant execute on function public.wallet_test_topup_create(uuid, integer) to service_role;
grant execute on function public.wallet_test_topup_confirm(uuid, text) to service_role;
grant execute on function public.wallet_test_topup_fail(uuid, text) to service_role;

commit;