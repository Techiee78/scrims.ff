-- ============================================================
-- 0019 — Deposit amount range is now ₹10 to ₹500 per payment.
--
-- Frontend (src/lib/deposits.js) and the Edge Functions
-- (_shared/deposits.ts → createDepositRequest / createNexupiOrder) use
-- COINS_MIN = 10 / COINS_MAX = 500, and the money RPCs enforce the same
-- range so a crafted request cannot slip outside it.
-- The daily cap stays ₹5,000 per user (DAILY_DEPOSIT_LIMIT).
--
-- Applied to the live project. Only the upper bound changed (10000 → 500);
-- the lower bound was already 10.
-- ============================================================

CREATE OR REPLACE FUNCTION public.deposit_request_create(p_user_id uuid, p_coins integer, p_reference text, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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

  if p_coins is null or p_coins < 10 or p_coins > 500 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  -- UTR = 12 digits only; spaces and dashes typed by the player are dropped.
  v_reference := regexp_replace(coalesce(p_reference, ''), '\D', '', 'g');
  if length(v_reference) <> 12 then
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
$function$;

CREATE OR REPLACE FUNCTION public.deposit_order_create(p_user_id uuid, p_coins integer, p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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

  if p_coins is null or p_coins < 10 or p_coins > 500 then
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
$function$;