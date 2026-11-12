-- 0007 — Manual UPI coin deposits with admin approval.
--
-- Flow: player picks coins -> pays on the admin's UPI QR -> submits the UPI
-- reference (UTR) -> an admin verifies the money in the bank and approves or
-- rejects it in the admin panel.
--
-- Separation of records (each is its own table, nothing is overwritten):
--   * deposit_requests  — the player's submission + its current status.
--   * deposit_decisions — the admin's decision, written once per request
--                         (unique index => a request can never be approved twice).
--   * admin_audit_log   — append-only trail of every admin action.
--
-- Money never moves on rejection: only the approve branch touches wallets.
-- All writes go through the SECURITY DEFINER RPCs below (service_role only);
-- clients can only read their own request/decision rows.

begin;

-- 1. Tables -----------------------------------------------------------------

create table if not exists public.deposit_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  coins integer not null check (coins > 0),
  amount_inr numeric(12,2) not null check (amount_inr > 0),
  reference text not null,
  payer_note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposit_decisions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.deposit_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  user_email text not null,
  action text not null check (action in ('approved', 'rejected')),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text not null,
  reason text,
  coins integer not null,
  amount_inr numeric(12,2) not null,
  balance_after numeric(12,2),
  wallet_txn_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text not null,
  action text not null,
  entity text not null,
  entity_id uuid,
  target_email text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('upi_payment', jsonb_build_object('upi_id', '', 'payee_name', 'Scrims.ff', 'active', false))
on conflict (key) do nothing;

-- 2. Indexes + hard idempotency guards --------------------------------------

create index if not exists deposit_requests_user_idx
  on public.deposit_requests (user_id, created_at desc);

create index if not exists deposit_requests_status_idx
  on public.deposit_requests (status, created_at desc);

-- A UPI reference can only ever sit on one live request: a rejected one is
-- free to be re-submitted, an approved/pending one is not.
create unique index if not exists deposit_requests_reference_key
  on public.deposit_requests (reference) where status <> 'rejected';

-- One decision per request, ever. This is the DB-level guarantee that a
-- request cannot be approved (or rejected) twice, even from two admins at once.
create unique index if not exists deposit_decisions_request_key
  on public.deposit_decisions (request_id);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

create index if not exists deposit_decisions_created_idx
  on public.deposit_decisions (created_at desc);

-- 3. updated_at triggers ----------------------------------------------------

drop trigger if exists deposit_requests_updated_at on public.deposit_requests;
create trigger deposit_requests_updated_at before update on public.deposit_requests
  for each row execute function public.set_updated_at();

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- 4. RLS — clients read their own rows only --------------------------------

alter table public.deposit_requests enable row level security;
alter table public.deposit_decisions enable row level security;
alter table public.admin_audit_log enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "deposit_requests_select_own" on public.deposit_requests;
create policy "deposit_requests_select_own" on public.deposit_requests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "deposit_decisions_select_own" on public.deposit_decisions;
create policy "deposit_decisions_select_own" on public.deposit_decisions
  for select to authenticated using (auth.uid() = user_id);

-- 5. RPC: create a deposit request (server-side only) ----------------------

create or replace function public.deposit_request_create(
  p_user_id uuid,
  p_coins integer,
  p_reference text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_reference text;
  v_pending integer;
  v_row public.deposit_requests%rowtype;
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

  v_reference := upper(regexp_replace(coalesce(p_reference, ''), '\s+', '', 'g'));
  if length(v_reference) < 4 or length(v_reference) > 64 or v_reference !~ '^[A-Z0-9-]+$' then
    raise exception 'invalid_reference' using errcode = '22023';
  end if;

  -- Keep the manual review queue sane: at most 3 open requests per player.
  select count(*) into v_pending
  from public.deposit_requests
  where user_id = p_user_id and status = 'pending';

  if v_pending >= 3 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  insert into public.deposit_requests (user_id, user_email, coins, amount_inr, reference, payer_note)
  values (
    p_user_id,
    v_email,
    p_coins,
    p_coins::numeric(12,2), -- 1 coin = ₹1
    v_reference,
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'coins', v_row.coins,
    'amountInr', v_row.amount_inr,
    'reference', v_row.reference,
    'status', v_row.status,
    'createdAt', v_row.created_at
  );
exception
  when unique_violation then
    raise exception 'duplicate_reference' using errcode = '23505';
end;
$$;

-- 6. RPC: admin decision (approve credits once, reject never credits) ------

create or replace function public.deposit_request_decide(
  p_admin_id uuid,
  p_request_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_email text;
  v_admin_role text;
  v_req public.deposit_requests%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance numeric(12,2);
  v_reason text;
  v_txn uuid;
begin
  if p_admin_id is null or p_request_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select coalesce(p.role, 'user'), u.email
    into v_admin_role, v_admin_email
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_admin_id;

  if v_admin_email is null or v_admin_role is distinct from 'admin' then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_action' using errcode = '22023';
  end if;

  v_reason := nullif(trim(coalesce(p_reason, '')), '');
  if p_action = 'reject' and v_reason is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  -- Lock the request: concurrent decisions on the same row serialize here.
  select * into v_req from public.deposit_requests where id = p_request_id for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'already_decided' using errcode = '22023';
  end if;

  if p_action = 'reject' then
    update public.deposit_requests
    set status = 'rejected', updated_at = now()
    where id = v_req.id;

    insert into public.deposit_decisions
      (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins, amount_inr, balance_after, wallet_txn_id)
    values
      (v_req.id, v_req.user_id, v_req.user_email, 'rejected', p_admin_id, v_admin_email, v_reason,
       v_req.coins, v_req.amount_inr, null, null);

    insert into public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, target_email, details)
    values (p_admin_id, v_admin_email, 'deposit.reject', 'deposit_request', v_req.id, v_req.user_email,
      jsonb_build_object('coins', v_req.coins, 'amount_inr', v_req.amount_inr,
                         'reference', v_req.reference, 'reason', v_reason));

    return jsonb_build_object('status', 'rejected', 'credited', false, 'coins', v_req.coins, 'balance', null);
  end if;

  -- Approve: credit exactly once.
  select * into v_wallet from public.wallets where user_id = v_req.user_id for update;
  if not found then
    select * into v_wallet from public.wallets
    where lower(user_email) = lower(v_req.user_email) for update;
  end if;
  if not found then
    insert into public.wallets (user_email, user_id, balance, total_won)
    values (v_req.user_email, v_req.user_id, 0, 0)
    returning * into v_wallet;
  end if;

  v_balance := coalesce(v_wallet.balance, 0) + v_req.coins::numeric(12,2);

  update public.wallets set balance = v_balance, updated_at = now() where id = v_wallet.id;

  insert into public.wallet_transactions
    (user_email, user_id, type, amount, label, balance_after)
  values
    (v_req.user_email, v_req.user_id, 'credit', v_req.coins,
     'UPI top-up · ' || v_req.coins || ' coins · ' || v_req.reference, v_balance)
  returning id into v_txn;

  update public.deposit_requests
  set status = 'approved', updated_at = now()
  where id = v_req.id;

  insert into public.deposit_decisions
    (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins, amount_inr, balance_after, wallet_txn_id)
  values
    (v_req.id, v_req.user_id, v_req.user_email, 'approved', p_admin_id, v_admin_email, v_reason,
     v_req.coins, v_req.amount_inr, v_balance, v_txn);

  insert into public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, target_email, details)
  values (p_admin_id, v_admin_email, 'deposit.approve', 'deposit_request', v_req.id, v_req.user_email,
    jsonb_build_object('coins', v_req.coins, 'amount_inr', v_req.amount_inr,
                       'reference', v_req.reference, 'balance_after', v_balance,
                       'wallet_txn_id', v_txn));

  return jsonb_build_object('status', 'approved', 'credited', true, 'coins', v_req.coins, 'balance', v_balance);
exception
  when unique_violation then
    -- The decision row already exists: this request was decided a moment ago.
    raise exception 'already_decided' using errcode = '22023';
end;
$$;

revoke all on function public.deposit_request_create(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.deposit_request_decide(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.deposit_request_create(uuid, integer, text, text) to service_role;
grant execute on function public.deposit_request_decide(uuid, uuid, text, text) to service_role;

commit;