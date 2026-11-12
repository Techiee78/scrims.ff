-- Only tournament winnings may be cashed out to UPI.
-- Withdrawable = min(balance, total_won) minus every withdrawal already pending
-- or approved. Deposits that were never won are not withdrawable.

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
  v_won numeric;
  v_used numeric;
  v_available numeric;
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

  select balance, coalesce(total_won, 0) into v_balance, v_won
  from public.wallets
  where user_id = p_user_id
  for update;

  if v_balance is null then
    select balance, coalesce(total_won, 0) into v_balance, v_won
    from public.wallets
    where user_email = v_email
    for update;
  end if;

  if v_balance is null then
    raise exception 'no_wallet';
  end if;

  select count(*) into v_pending_count
  from public.withdrawal_requests
  where user_id = p_user_id and status = 'pending';

  if v_pending_count >= 3 then
    raise exception 'too_many_pending';
  end if;

  select coalesce(sum(coins), 0) into v_used
  from public.withdrawal_requests
  where user_id = p_user_id and status in ('pending', 'approved');

  v_available := greatest(0, least(v_balance, v_won) - v_used);

  if p_coins > v_available then
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