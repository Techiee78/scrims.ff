-- ============================================================
-- Phase 2 security hardening — admin boundary & privilege escalation.
--
-- Apply with: supabase db push   (or paste into the SQL editor)
--
-- The two admin wallet RPCs were executable by every signed-in user straight
-- from the browser (they were guarded internally by is_admin(), but that put
-- the only check on a publicly reachable endpoint and left no audit trail).
-- They are replaced by service_role-only functions that take the acting admin
-- explicitly, so the Edge Function authorises once and every coin adjustment is
-- recorded in admin_audit_log.
-- ============================================================

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
  v_coins numeric := floor(coalesce(p_coins, 0));
  v_email text := btrim(coalesce(p_user_email, ''));
  v_balance numeric;
  v_wallet public.wallets%rowtype;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if v_email = '' then
    raise exception 'A user email is required';
  end if;
  if v_coins = 0 then
    raise exception 'Enter a coin amount';
  end if;

  insert into public.wallets (user_email, balance, total_won)
  values (v_email, 0, 0)
  on conflict (user_email) do nothing;

  select * into v_wallet from public.wallets where user_email = v_email for update;
  v_balance := greatest(0, coalesce(v_wallet.balance, 0) + v_coins);
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
    jsonb_build_object('coins', v_coins, 'balance_after', v_balance, 'label', p_label)
  );

  return v_balance;
end;
$$;

create or replace function public.admin_wallet_list(p_actor_id uuid)
returns table(user_email text, balance numeric)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and role = 'admin') then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query select w.user_email, w.balance from public.wallets w;
end;
$$;

-- The browser-reachable versions go away entirely.
drop function if exists public.admin_adjust_coins(text, numeric, text);
drop function if exists public.admin_list_wallets();

-- Only the Edge Functions (service_role) may run these.
revoke all on function public.admin_wallet_adjust(uuid, text, text, numeric, text) from public, anon, authenticated;
revoke all on function public.admin_wallet_list(uuid) from public, anon, authenticated;
grant execute on function public.admin_wallet_adjust(uuid, text, text, numeric, text) to service_role;
grant execute on function public.admin_wallet_list(uuid) to service_role;

-- Belt and braces: no app role may execute a privileged public function that
-- takes an explicit actor id.
revoke all on function public.admin_set_user_role(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.admin_transfer_admin(uuid, text, uuid) from public, anon, authenticated;