-- Deposit UTRs are exactly 12 digits (bank UPI reference numbers), and WhatsApp
-- numbers are exactly 10 digits. Enforced in the RPC so a direct API call cannot
-- store anything else.

begin;

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
$$;

revoke all on function public.deposit_request_create(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.deposit_request_create(uuid, integer, text, text) to service_role;

-- A reference row can never hold anything but 12 digits.
alter table public.deposit_requests
  drop constraint if exists deposit_requests_reference_12_digits;
alter table public.deposit_requests
  add constraint deposit_requests_reference_12_digits
  check (reference ~ '^[0-9]{12}$') not valid;

commit;