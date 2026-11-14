-- Atomic match results + winnings.
--
-- Before this, recordMatchResults saved the kills/placements, then credited
-- each player's wallet in a separate round trip, then marked the match
-- completed. If any step failed halfway (a timeout, a dropped request, an
-- admin closing the tab) the match could be left with some players paid and
-- others not, and saving again would silently re-pay or mis-adjust them.
--
-- The prize maths stays in the edge function (it is the same maths the payout
-- preview shows the admin). This function receives the finished plan and
-- applies every write inside one transaction: the match row is locked, each
-- wallet row is locked, and either the whole payout lands or none of it does.

create or replace function public.record_match_results(
  p_tournament_id bigint,
  p_results jsonb,
  p_payouts jsonb,
  p_label text
) returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_wallet public.wallets;
  v_row record;
  v_prev numeric;
  v_txn_id uuid;
  v_delta numeric;
  v_balance numeric;
  v_paid int := 0;
  v_adjusted int := 0;
  v_total numeric := 0;
  v_saved int := 0;
begin
  perform 1 from public.tournaments where id = p_tournament_id for update;
  if not found then
    return jsonb_build_object('error', 'Match not found', 'status', 404);
  end if;

  -- 1. Kills and placements for the players who are actually in this match.
  update public.registrations r
     set kills = greatest(0, coalesce((x->>'kills')::int, 0)),
         placement = greatest(0, coalesce((x->>'placement')::int, 0)),
         played = greatest(0, coalesce((x->>'placement')::int, 0)) > 0
    from jsonb_array_elements(p_results) x
   where r.id = (x->>'registration_id')::bigint
     and r.tournament_id = p_tournament_id
     and r.status = 'joined';
  get diagnostics v_saved = row_count;

  -- 2. Winnings, in the same transaction as the results above.
  for v_row in
    select p.email, greatest(0, coalesce(p.amount, 0))::numeric as amount
      from jsonb_to_recordset(p_payouts) as p(email text, amount numeric)
     where p.email is not null and p.email <> ''
  loop
    insert into public.wallets (user_email, balance, total_won)
    values (v_row.email, 0, 0)
    on conflict (user_email) do nothing;

    select * into v_wallet from public.wallets where user_email = v_row.email for update;

    -- A match is paid once: an existing "Winning" entry for this match is
    -- corrected to the new amount instead of paying a second time.
    select id, amount into v_txn_id, v_prev
      from public.wallet_transactions
     where tournament_id = p_tournament_id
       and type = 'credit'
       and user_email = v_row.email
     order by created_at
     limit 1;

    if v_txn_id is null and v_row.amount <= 0 then
      continue;
    end if;

    v_delta := v_row.amount - coalesce(v_prev, 0);

    if v_txn_id is not null and v_delta = 0 then
      v_total := v_total + v_row.amount;
      continue;
    end if;

    v_balance := greatest(0, coalesce(v_wallet.balance, 0) + v_delta);

    update public.wallets
       set balance = v_balance,
           total_won = greatest(0, coalesce(total_won, 0) + v_delta)
     where user_email = v_row.email;

    if v_txn_id is null then
      insert into public.wallet_transactions (user_email, type, amount, label, balance_after, tournament_id)
      values (v_row.email, 'credit', v_row.amount, p_label, v_balance, p_tournament_id);
      v_paid := v_paid + 1;
    elsif v_row.amount <= 0 then
      delete from public.wallet_transactions where id = v_txn_id;
      v_adjusted := v_adjusted + 1;
    else
      update public.wallet_transactions
         set amount = v_row.amount,
             balance_after = v_balance,
             label = p_label
       where id = v_txn_id;
      v_adjusted := v_adjusted + 1;
    end if;

    v_total := v_total + v_row.amount;
  end loop;

  -- Saving the results is what finishes a match.
  update public.tournaments set status = 'completed' where id = p_tournament_id;

  return jsonb_build_object(
    'saved', v_saved,
    'paid', v_paid,
    'adjusted', v_adjusted,
    'payoutTotal', v_total
  );
end;
$$;

-- Only the service role (backend functions) may run this.
revoke all on function public.record_match_results(bigint, jsonb, jsonb, text) from public;
revoke all on function public.record_match_results(bigint, jsonb, jsonb, text) from anon;
revoke all on function public.record_match_results(bigint, jsonb, jsonb, text) from authenticated;
grant execute on function public.record_match_results(bigint, jsonb, jsonb, text) to service_role;