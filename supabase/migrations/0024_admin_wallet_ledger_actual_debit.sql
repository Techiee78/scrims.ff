-- Phase 4B: make admin wallet ledger debit match the actual deducted balance.
create or replace function public.admin_wallet_adjust(
  p_actor_id uuid,
  p_actor_email text,
  p_user_email text,
  p_coins numeric,
  p_label text default null
)
returns numeric
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_requested_coins numeric := floor(coalesce(p_coins, 0));
  v_coins numeric;
  v_email text := btrim(coalesce(p_user_email, ''));
  v_balance numeric;
  v_previous_balance numeric;
  v_wallet public.wallets%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'A user email is required';
  end if;
  if v_requested_coins = 0 then
    raise exception 'Enter a coin amount';
  end if;

  insert into public.wallets (user_email, balance, total_won)
  values (v_email, 0, 0)
  on conflict (user_email) do nothing;

  select * into v_wallet from public.wallets where user_email = v_email for update;
  v_previous_balance := coalesce(v_wallet.balance, 0);
  v_balance := greatest(0, v_previous_balance + v_requested_coins);
  -- Ledger the amount actually applied, not the requested debit when clamped to zero.
  v_coins := v_balance - v_previous_balance;

  update public.wallets set balance = v_balance where user_email = v_email;

  insert into public.wallet_transactions (user_email, type, amount, label, balance_after)
  values (
    v_email,
    case when v_coins > 0 then 'credit' else 'debit' end,
    abs(v_coins),
    coalesce(
      nullif(btrim(coalesce(p_label, '')), ''),
      case when v_coins > 0 then 'Coins added by admin' else 'Coins removed by admin' end
    ),
    v_balance
  );

  insert into public.admin_audit_log (actor_id, actor_email, action, entity, target_email, details)
  values (
    p_actor_id,
    coalesce(nullif(btrim(coalesce(p_actor_email, '')), ''), 'admin'),
    'wallet.adjust',
    'wallet',
    v_email,
    jsonb_build_object(
      'requested_coins', v_requested_coins,
      'applied_coins', v_coins,
      'balance_before', v_previous_balance,
      'balance_after', v_balance,
      'label', p_label
    )
  );

  return v_balance;
end;
$$;
revoke all on function public.admin_wallet_adjust(uuid, text, text, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_wallet_adjust(uuid, text, text, numeric, text) to service_role;
