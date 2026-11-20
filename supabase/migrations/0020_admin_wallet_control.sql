-- ============================================================
-- 0020 — Admin wallet control.
-- Lets an admin see every wallet balance and add or remove coins.
-- The RPCs run as the caller's session and check the profile role
-- themselves, so the anon key alone can never move coins.
-- Safe to run more than once.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Every wallet balance, for the admin user list.
create or replace function public.admin_list_wallets()
returns table (user_email text, balance numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  return query select w.user_email, w.balance from public.wallets w;
end;
$$;

revoke all on function public.admin_list_wallets() from public, anon;
grant execute on function public.admin_list_wallets() to authenticated, service_role;

-- Adds (p_coins > 0) or removes (p_coins < 0) coins, records the ledger entry
-- and returns the new balance. A balance never drops below zero.
create or replace function public.admin_adjust_coins(
  p_user_email text,
  p_coins numeric,
  p_label text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coins numeric := floor(coalesce(p_coins, 0));
  v_balance numeric;
  v_wallet public.wallets%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  if p_user_email is null or btrim(p_user_email) = '' then
    raise exception 'A user email is required';
  end if;

  if v_coins = 0 then
    raise exception 'Enter a coin amount';
  end if;

  insert into public.wallets (user_email, balance, total_won)
  values (p_user_email, 0, 0)
  on conflict (user_email) do nothing;

  select * into v_wallet from public.wallets where user_email = p_user_email for update;

  v_balance := greatest(0, coalesce(v_wallet.balance, 0) + v_coins);

  update public.wallets set balance = v_balance where user_email = p_user_email;

  insert into public.wallet_transactions (user_email, type, amount, label, balance_after)
  values (
    p_user_email,
    case when v_coins > 0 then 'credit' else 'debit' end,
    abs(v_coins),
    coalesce(
      nullif(btrim(coalesce(p_label, '')), ''),
      case when v_coins > 0 then 'Coins added by admin' else 'Coins removed by admin' end
    ),
    v_balance
  );

  return v_balance;
end;
$$;

revoke all on function public.admin_adjust_coins(text, numeric, text) from public, anon;
grant execute on function public.admin_adjust_coins(text, numeric, text) to authenticated, service_role;