-- Phase 4/6: serialize deposit creation for per-user daily and pending caps.
-- Shared advisory lock ensures manual and NexUPI creation cannot race each other.
create or replace function public.deposit_request_create(
  p_user_id uuid,
  p_coins integer,
  p_reference text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_email text;
  v_reference text;
  v_pending integer;
  v_used integer;
  v_ist_day_start timestamptz;
  v_row public.deposit_requests%rowtype;
begin
  if p_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_coins is null or p_coins < 10 or p_coins > 500 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_reference := regexp_replace(coalesce(p_reference, ''), '\D', '', 'g');
  if length(v_reference) <> 12 then
    raise exception 'invalid_reference' using errcode = '22023';
  end if;

  -- Lock all deposit creation types for this player.
  perform pg_advisory_xact_lock(hashtextextended('deposit_create_user:' || p_user_id::text, 0));

  select count(*) into v_pending
  from public.deposit_requests
  where user_id = p_user_id and status = 'pending';

  if v_pending >= 3 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  -- Midnight IST converted to UTC; approved and pending both count.
  v_ist_day_start := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  select coalesce(sum(coins), 0)::integer into v_used
  from public.deposit_requests
  where user_id = p_user_id
    and created_at >= v_ist_day_start
    and status in ('pending', 'approved');

  if v_used + p_coins > 5000 then
    raise exception 'daily_limit_exceeded' using errcode = '22023';
  end if;

  insert into public.deposit_requests (user_id, user_email, coins, amount_inr, reference, payer_note)
  values (
    p_user_id,
    v_email,
    p_coins,
    p_coins::numeric(12,2),
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
$function$;

create or replace function public.deposit_order_create(
  p_user_id uuid,
  p_coins integer,
  p_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  v_email text;
  v_order text;
  v_open integer;
  v_used integer;
  v_ist_day_start timestamptz;
  v_row public.deposit_requests%rowtype;
begin
  if p_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select u.email into v_email from auth.users u where u.id = p_user_id;
  if v_email is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if p_coins is null or p_coins < 10 or p_coins > 500 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  v_order := upper(regexp_replace(coalesce(p_order_id, ''), '[^A-Za-z0-9]', '', 'g'));
  if length(v_order) < 6 or length(v_order) > 40 then
    raise exception 'invalid_order' using errcode = '22023';
  end if;

  -- Lock all deposit creation types for this player.
  perform pg_advisory_xact_lock(hashtextextended('deposit_create_user:' || p_user_id::text, 0));

  select count(*) into v_open
  from public.deposit_requests
  where user_id = p_user_id and status = 'pending' and provider = 'nexupi';

  if v_open >= 5 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  -- Midnight IST converted to UTC; approved and pending both count.
  v_ist_day_start := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  select coalesce(sum(coins), 0)::integer into v_used
  from public.deposit_requests
  where user_id = p_user_id
    and created_at >= v_ist_day_start
    and status in ('pending', 'approved');

  if v_used + p_coins > 5000 then
    raise exception 'daily_limit_exceeded' using errcode = '22023';
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
$function$;

-- These functions remain callable only by service_role.
revoke all on function public.deposit_request_create(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.deposit_order_create(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.deposit_request_create(uuid, integer, text, text) to service_role;
grant execute on function public.deposit_order_create(uuid, integer, text) to service_role;
