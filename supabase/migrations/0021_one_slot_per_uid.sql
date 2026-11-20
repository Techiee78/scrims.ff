-- One slot per player per match, by Free Fire UID as well as by account.
-- join_tournament now also refuses when any UID in the new booking (the
-- joiner or a teammate) already holds a joined slot in this match, whether as
-- a main player or as a teammate. The check runs inside the locked match row,
-- so two bookings cannot slip the same UID in at the same moment.

create or replace function public.join_tournament(
  p_user_id uuid,
  p_user_email text,
  p_user_name text,
  p_tournament_id bigint,
  p_ff_ign text,
  p_ff_uid text,
  p_whatsapp text,
  p_teammates text[] default '{}',
  p_teammate_details jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_t public.tournaments;
  v_capacity int;
  v_fee numeric;
  v_wallet public.wallets;
  v_balance numeric;
  v_slot int;
  v_reg public.registrations;
  v_uids text[];
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then
    return jsonb_build_object('error', 'Match not found', 'status', 404);
  end if;

  if coalesce(v_t.status, 'upcoming') <> 'upcoming' then
    return jsonb_build_object('error', 'Entry is closed for this match.', 'status', 400);
  end if;

  if v_t.match_time is not null and v_t.match_time <= now() then
    return jsonb_build_object('error', 'Entry closed — this match has already started.', 'status', 400);
  end if;

  v_capacity := case
    when v_t.mode = 'CS' then 2
    when v_t.team_type = 'Duo' then 24
    when v_t.team_type = 'Squad' then 12
    else 48
  end;

  if coalesce(v_t.filled_slots, 0) >= v_capacity then
    return jsonb_build_object('error', 'All slots for this match are full', 'status', 400);
  end if;

  if exists (
    select 1 from public.registrations r
    where r.tournament_id = p_tournament_id
      and lower(r.user_email) = lower(p_user_email)
      and r.status = 'joined'
  ) then
    return jsonb_build_object('error', 'You already hold a slot in this match', 'status', 400);
  end if;

  -- Every Free Fire UID in this booking (joiner + teammates).
  v_uids := array[btrim(coalesce(p_ff_uid, ''))] || coalesce(array(
    select btrim(coalesce(x->>'ff_uid', ''))
    from jsonb_array_elements(coalesce(p_teammate_details, '[]'::jsonb)) x
  ), '{}');

  -- A UID already holding a joined slot in this match (as main player or teammate) is refused.
  if exists (
    select 1 from public.registrations r
    where r.tournament_id = p_tournament_id
      and r.status = 'joined'
      and (
        btrim(coalesce(r.ff_uid, '')) = any(v_uids)
        or exists (
          select 1 from jsonb_array_elements(coalesce(r.teammate_details, '[]'::jsonb)) td
          where btrim(coalesce(td->>'ff_uid', '')) = any(v_uids)
        )
      )
  ) then
    return jsonb_build_object(
      'error', 'A player can hold only one slot in a match — one of these UIDs is already in this match',
      'status', 400
    );
  end if;

  v_fee := greatest(0, coalesce(v_t.entry_fee, 0));

  select * into v_wallet from public.wallets where user_email = p_user_email for update;
  if not found then
    insert into public.wallets (user_email, user_id, balance, total_won)
    values (p_user_email, p_user_id, 0, 0)
    returning * into v_wallet;
  end if;

  v_balance := coalesce(v_wallet.balance, 0);
  if v_balance < v_fee then
    return jsonb_build_object('error', 'Not enough coins — top up your wallet to join', 'status', 400);
  end if;

  v_balance := v_balance - v_fee;
  v_slot := coalesce(v_t.filled_slots, 0) + 1;

  if v_fee > 0 then
    update public.wallets
       set balance = v_balance, updated_at = now()
     where id = v_wallet.id;

    insert into public.wallet_transactions
      (user_email, user_id, type, amount, label, balance_after, tournament_id)
    values
      (p_user_email, p_user_id, 'debit', v_fee, 'Entry fee · ' || v_t.title, v_balance, p_tournament_id);
  end if;

  insert into public.registrations (
    tournament_id, tournament_title, mode, user_email, user_id, user_name,
    ff_ign, ff_uid, whatsapp, teammates, teammate_details, slot_number, entry_fee, status
  ) values (
    p_tournament_id, v_t.title, v_t.mode, p_user_email, p_user_id,
    coalesce(nullif(btrim(p_user_name), ''), p_user_email),
    btrim(p_ff_ign), btrim(p_ff_uid), p_whatsapp,
    coalesce(p_teammates, '{}'), coalesce(p_teammate_details, '[]'::jsonb),
    v_slot, v_fee, 'joined'
  )
  returning * into v_reg;

  update public.tournaments
     set filled_slots = v_slot,
         total_slots = v_capacity,
         updated_at = now()
   where id = p_tournament_id;

  return jsonb_build_object('ok', true, 'balance', v_balance, 'registration', to_jsonb(v_reg));
exception
  when unique_violation then
    return jsonb_build_object('error', 'You already hold a slot in this match', 'status', 400);
end;
$$;

revoke all on function public.join_tournament(uuid, text, text, bigint, text, text, text, text[], jsonb) from public, anon, authenticated;