-- Manual coin withdrawals.
-- The player asks to cash out coins to their own UPI ID; the admin pays by hand
-- in their banking app, then approves (coins debited exactly once) or rejects
-- (balance untouched). Requests, decisions and the audit log stay separate.

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text not null,
  coins integer not null,
  payout_upi text not null,
  account_name text not null,
  player_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists withdrawal_requests_user_idx
  on public.withdrawal_requests (user_id, created_at desc);
create index if not exists withdrawal_requests_status_idx
  on public.withdrawal_requests (status, created_at);

-- One decision row per request (unique) -> an approval can never be applied twice.
create table if not exists public.withdrawal_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.withdrawal_requests (id) on delete cascade,
  user_id uuid,
  user_email text not null,
  action text not null check (action in ('approve', 'reject')),
  admin_id uuid,
  admin_email text not null,
  reason text,
  coins integer not null,
  payout_ref text,
  balance_after numeric,
  wallet_txn_id uuid,
  created_at timestamptz not null default now()
);

drop trigger if exists withdrawal_requests_updated_at on public.withdrawal_requests;
create trigger withdrawal_requests_updated_at
  before update on public.withdrawal_requests
  for each row execute function public.set_updated_at();

alter table public.withdrawal_requests enable row level security;
alter table public.withdrawal_decisions enable row level security;

drop policy if exists withdrawal_requests_read on public.withdrawal_requests;
create policy withdrawal_requests_read on public.withdrawal_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists withdrawal_decisions_read on public.withdrawal_decisions;
create policy withdrawal_decisions_read on public.withdrawal_decisions
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Writes only ever happen through the two RPCs below (service role only).
revoke all on public.withdrawal_requests from anon, authenticated;
revoke all on public.withdrawal_decisions from anon, authenticated;
grant select on public.withdrawal_requests to authenticated;
grant select on public.withdrawal_decisions to authenticated;
grant all on public.withdrawal_requests to service_role;
grant all on public.withdrawal_decisions to service_role;

-- Player asks for a payout. Balance is not touched here; it is checked against
-- the balance minus everything already pending, so requests cannot overspend.
create or replace function public.withdrawal_request_create(
  p_user_id uuid,
  p_coins integer,
  p_payout_upi text,
  p_account_name text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_balance numeric;
  v_pending numeric;
  v_pending_count integer;
  v_upi text := lower(btrim(coalesce(p_payout_upi, '')));
  v_name text := btrim(coalesce(p_account_name, ''));
  v_id uuid;
  v_created timestamptz;
begin
  if p_user_id is null then
    raise exception 'unauthorized';
  end if;

  if p_coins is null or p_coins < 100 or p_coins > 5000 then
    raise exception 'invalid_amount';
  end if;

  if v_upi !~ '^[a-z0-9.\-_]{2,}@[a-z]{2,}$' then
    raise exception 'invalid_upi';
  end if;

  if length(v_name) < 2 or length(v_name) > 60 then
    raise exception 'invalid_name';
  end if;

  select coalesce(nullif(p.email, ''), u.email) into v_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_user_id;

  if v_email is null or v_email = '' then
    raise exception 'unknown_user';
  end if;

  select balance into v_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_balance is null then
    raise exception 'no_wallet';
  end if;

  select count(*), coalesce(sum(coins), 0)
    into v_pending_count, v_pending
  from public.withdrawal_requests
  where user_id = p_user_id and status = 'pending';

  if v_pending_count >= 3 then
    raise exception 'too_many_pending';
  end if;

  if p_coins > v_balance - v_pending then
    raise exception 'insufficient_balance';
  end if;

  insert into public.withdrawal_requests (user_id, user_email, coins, payout_upi, account_name, player_note)
  values (p_user_id, v_email, p_coins, v_upi, v_name, nullif(left(coalesce(p_note, ''), 140), ''))
  returning id, created_at into v_id, v_created;

  return jsonb_build_object(
    'id', v_id,
    'coins', p_coins,
    'upi', v_upi,
    'account_name', v_name,
    'status', 'pending',
    'created_at', v_created
  );
end;
$$;

-- Admin decision. Approve debits the wallet once and records a wallet txn;
-- reject changes no money at all.
create or replace function public.withdrawal_request_decide(
  p_admin_id uuid,
  p_request_id uuid,
  p_action text,
  p_reason text,
  p_payout_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.withdrawal_requests;
  v_admin_email text;
  v_balance numeric;
  v_new_balance numeric;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_ref text := nullif(upper(regexp_replace(coalesce(p_payout_ref, ''), '\s+', '', 'g')), '');
  v_txn uuid;
begin
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_action';
  end if;

  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'already_decided';
  end if;
  if exists (select 1 from public.withdrawal_decisions where request_id = p_request_id) then
    raise exception 'already_decided';
  end if;

  select coalesce(nullif(p.email, ''), a.email) into v_admin_email
  from auth.users a
  left join public.profiles p on p.id = a.id
  where a.id = p_admin_id;

  if v_admin_email is null or v_admin_email = '' then
    raise exception 'unknown_admin';
  end if;

  if p_action = 'reject' then
    if v_reason is null or length(v_reason) < 3 then
      raise exception 'reason_required';
    end if;

    insert into public.withdrawal_decisions
      (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins)
    values
      (p_request_id, v_req.user_id, v_req.user_email, 'reject', p_admin_id, v_admin_email, v_reason, v_req.coins);

    update public.withdrawal_requests set status = 'rejected' where id = p_request_id;

    insert into public.admin_audit_log
      (actor_id, actor_email, action, entity, entity_id, target_email, details)
    values
      (p_admin_id, v_admin_email, 'withdrawal.reject', 'withdrawal_requests', p_request_id, v_req.user_email,
       jsonb_build_object('coins', v_req.coins, 'reason', v_reason));

    return jsonb_build_object('status', 'rejected', 'coins', v_req.coins);
  end if;

  select balance into v_balance
  from public.wallets
  where user_id = v_req.user_id
  for update;

  if v_balance is null or v_balance < v_req.coins then
    raise exception 'insufficient_balance';
  end if;

  v_new_balance := v_balance - v_req.coins;

  update public.wallets
  set balance = v_new_balance, updated_at = now()
  where user_id = v_req.user_id;

  insert into public.wallet_transactions (user_id, user_email, type, amount, label, balance_after)
  values (v_req.user_id, v_req.user_email, 'debit', v_req.coins, 'Withdrawal to UPI', v_new_balance)
  returning id into v_txn;

  insert into public.withdrawal_decisions
    (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins, payout_ref, balance_after, wallet_txn_id)
  values
    (p_request_id, v_req.user_id, v_req.user_email, 'approve', p_admin_id, v_admin_email, v_reason, v_req.coins,
     v_ref, v_new_balance, v_txn);

  update public.withdrawal_requests set status = 'approved' where id = p_request_id;

  insert into public.admin_audit_log
    (actor_id, actor_email, action, entity, entity_id, target_email, details)
  values
    (p_admin_id, v_admin_email, 'withdrawal.approve', 'withdrawal_requests', p_request_id, v_req.user_email,
     jsonb_build_object('coins', v_req.coins, 'balance_after', v_new_balance, 'payout_ref', v_ref));

  return jsonb_build_object(
    'status', 'approved',
    'coins', v_req.coins,
    'balance', v_new_balance,
    'payout_ref', v_ref
  );
end;
$$;

revoke all on function public.withdrawal_request_create(uuid, integer, text, text, text) from public;
revoke all on function public.withdrawal_request_decide(uuid, uuid, text, text, text) from public;
grant execute on function public.withdrawal_request_create(uuid, integer, text, text, text) to service_role;
grant execute on function public.withdrawal_request_decide(uuid, uuid, text, text, text) to service_role;