-- 0015 — Automatic (NexUPI) coin payments next to the manual UPI flow.
--
-- The admin picks one payment mode for the whole app:
--   * manual    — the existing flow: player pays on the admin's UPI QR and an
--                 admin approves the request by hand (nothing changes there).
--   * automatic — the player pays on a NexUPI order; the NexUPI status check /
--                 webhook credits the coins with no admin action.
--
-- Money still only moves inside a SECURITY DEFINER RPC (service_role only):
--   deposit_order_create — opens a pending order row for a NexUPI order id.
--   deposit_order_settle — marks the order paid (credits once) or failed.
-- The unique index on provider_order_id plus the row lock make a second
-- credit for the same order impossible.

begin;

-- 1. Settings ---------------------------------------------------------------

insert into public.app_settings (key, value)
values ('payment_mode', jsonb_build_object('mode', 'manual'))
on conflict (key) do nothing;

insert into public.app_settings (key, value)
values ('nexupi', jsonb_build_object('token', '', 'create_url', '', 'status_url', ''))
on conflict (key) do nothing;

-- 2. Orders live in the same ledger as manual requests ----------------------

alter table public.deposit_requests
  add column if not exists provider text not null default 'manual',
  add column if not exists provider_order_id text,
  add column if not exists provider_status text,
  add column if not exists settled_at timestamptz;

alter table public.deposit_requests
  drop constraint if exists deposit_requests_provider_check;
alter table public.deposit_requests
  add constraint deposit_requests_provider_check check (provider in ('manual', 'nexupi'));

create unique index if not exists deposit_requests_provider_order_key
  on public.deposit_requests (provider_order_id)
  where provider_order_id is not null;

-- 3. RPC: open a pending order (server-side only) ---------------------------

create or replace function public.deposit_order_create(
  p_user_id uuid,
  p_coins integer,
  p_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_order text;
  v_open integer;
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

  v_order := upper(regexp_replace(coalesce(p_order_id, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_order) < 6 or length(v_order) > 40 then
    raise exception 'invalid_order' using errcode = '22023';
  end if;

  -- Abandoned orders expire at NexUPI after 30 minutes; this only stops a
  -- single player opening dozens of them at once.
  select count(*) into v_open
  from public.deposit_requests
  where user_id = p_user_id and status = 'pending' and provider = 'nexupi';

  if v_open >= 5 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  insert into public.deposit_requests
    (user_id, user_email, coins, amount_inr, reference, status, provider, provider_order_id, provider_status)
  values
    (p_user_id, v_email, p_coins, p_coins::numeric(12,2), v_order, 'pending', 'nexupi', v_order, 'created')
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'coins', v_row.coins,
    'amountInr', v_row.amount_inr,
    'orderId', v_row.provider_order_id,
    'status', v_row.status
  );
end;
$$;

-- 4. RPC: settle an order — credit exactly once, or close it as failed ------

create or replace function public.deposit_order_settle(
  p_order_id text,
  p_outcome text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_order text;
  v_req public.deposit_requests%rowtype;
  v_wallet public.wallets%rowtype;
  v_balance numeric(12,2);
  v_txn uuid;
  v_note text;
begin
  v_order := upper(regexp_replace(coalesce(p_order_id, ''), '[^A-Za-z0-9]', '', 'g'));
  if v_order = '' then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if p_outcome not in ('success', 'failure') then
    raise exception 'invalid_outcome' using errcode = '22023';
  end if;

  -- Lock the order: a webhook and a status poll arriving together serialize here.
  select * into v_req
  from public.deposit_requests
  where provider_order_id = v_order
  for update;

  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;

  if v_req.status <> 'pending' then
    return jsonb_build_object(
      'status', v_req.status,
      'credited', v_req.status = 'approved',
      'already', true,
      'coins', v_req.coins,
      'balance', null
    );
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');

  if p_outcome = 'failure' then
    update public.deposit_requests
    set status = 'rejected', provider_status = 'failed', settled_at = now(), updated_at = now()
    where id = v_req.id;

    insert into public.deposit_decisions
      (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins, amount_inr, balance_after, wallet_txn_id)
    values
      (v_req.id, v_req.user_id, v_req.user_email, 'rejected', null, 'NexUPI (automatic)',
       coalesce(v_note, 'Payment was not completed at UPI.'),
       v_req.coins, v_req.amount_inr, null, null);

    insert into public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, target_email, details)
    values (null, 'nexupi@automatic', 'deposit.auto_reject', 'deposit_request', v_req.id, v_req.user_email,
      jsonb_build_object('order_id', v_order, 'coins', v_req.coins, 'amount_inr', v_req.amount_inr));

    return jsonb_build_object('status', 'rejected', 'credited', false, 'already', false,
                              'coins', v_req.coins, 'balance', null);
  end if;

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
     'Instant UPI top-up · ' || v_req.coins || ' coins', v_balance)
  returning id into v_txn;

  update public.deposit_requests
  set status = 'approved', provider_status = 'success', settled_at = now(), updated_at = now()
  where id = v_req.id;

  insert into public.deposit_decisions
    (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins, amount_inr, balance_after, wallet_txn_id)
  values
    (v_req.id, v_req.user_id, v_req.user_email, 'approved', null, 'NexUPI (automatic)', v_note,
     v_req.coins, v_req.amount_inr, v_balance, v_txn);

  insert into public.admin_audit_log (actor_id, actor_email, action, entity, entity_id, target_email, details)
  values (null, 'nexupi@automatic', 'deposit.auto_approve', 'deposit_request', v_req.id, v_req.user_email,
    jsonb_build_object('order_id', v_order, 'coins', v_req.coins, 'amount_inr', v_req.amount_inr,
                       'balance_after', v_balance, 'wallet_txn_id', v_txn));

  return jsonb_build_object('status', 'approved', 'credited', true, 'already', false,
                            'coins', v_req.coins, 'balance', v_balance);
end;
$$;

revoke all on function public.deposit_order_create(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.deposit_order_settle(text, text, text) from public, anon, authenticated;

grant execute on function public.deposit_order_create(uuid, integer, text) to service_role;
grant execute on function public.deposit_order_settle(text, text, text) to service_role;

commit;