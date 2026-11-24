-- Draft hardening for privileged RPC actor checks.
-- IMPORTANT: This migration is source-only until explicitly reviewed and applied
-- to the live Supabase project.

create or replace function public.admin_set_user_role(
  p_actor_id uuid,
  p_actor_email text,
  p_target_id uuid,
  p_new_role text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor_role text;
  v_actor_canonical_email text;
  v_old_role text;
  v_target_email text;
begin
  if p_new_role is null or p_new_role not in ('admin', 'user') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if p_actor_id is null or p_target_id is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  select role, email into v_actor_role, v_actor_canonical_email
    from public.profiles where id = p_actor_id;
  if v_actor_role is distinct from 'admin' then
    raise exception 'actor_not_admin' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_actor_email, '')), '') is not null
     and lower(btrim(p_actor_email)) <> lower(coalesce(v_actor_canonical_email, '')) then
    raise exception 'actor_email_mismatch' using errcode = 'P0001';
  end if;

  if p_actor_id = p_target_id and p_new_role <> 'admin' then
    raise exception 'self_demotion_blocked' using errcode = 'P0001';
  end if;

  select role, email into v_old_role, v_target_email
    from public.profiles where id = p_target_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  perform set_config('app.actor_id', p_actor_id::text, true);
  perform set_config('app.actor_email', coalesce(v_actor_canonical_email, ''), true);

  update public.profiles set role = p_new_role, updated_at = now()
   where id = p_target_id;

  return jsonb_build_object('id', p_target_id, 'email', v_target_email,
    'old_role', v_old_role, 'new_role', p_new_role);
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, text, uuid, text) to service_role;

create or replace function public.admin_transfer_admin(
  p_actor_id uuid,
  p_actor_email text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor_role text;
  v_actor_canonical_email text;
  v_target_role text;
  v_target_email text;
begin
  if p_actor_id is null or p_target_id is null or p_actor_id = p_target_id then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  select role, email into v_actor_role, v_actor_canonical_email
    from public.profiles where id = p_actor_id;
  if v_actor_role is distinct from 'admin' then
    raise exception 'actor_not_admin' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_actor_email, '')), '') is not null
     and lower(btrim(p_actor_email)) <> lower(coalesce(v_actor_canonical_email, '')) then
    raise exception 'actor_email_mismatch' using errcode = 'P0001';
  end if;

  select role, email into v_target_role, v_target_email
    from public.profiles where id = p_target_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  perform set_config('app.actor_id', p_actor_id::text, true);
  perform set_config('app.actor_email', coalesce(v_actor_canonical_email, ''), true);

  update public.profiles set role = 'user', updated_at = now() where id = p_actor_id;
  update public.profiles set role = 'admin', updated_at = now() where id = p_target_id;

  return jsonb_build_object('from_id', p_actor_id, 'to_id', p_target_id,
    'to_email', v_target_email, 'previous_role', v_target_role);
end;
$$;

revoke all on function public.admin_transfer_admin(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_transfer_admin(uuid, text, uuid) to service_role;

-- Withdrawal decisions: validate admin actor inside the SECURITY DEFINER RPC too,
-- rather than trusting only the Edge Function's gate. Financial logic remains unchanged.
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
set search_path to 'public'
as $$
declare
  v_req public.withdrawal_requests;
  v_admin_email text;
  v_balance numeric;
  v_new_balance numeric;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_ref text := nullif(upper(regexp_replace(coalesce(p_payout_ref, ''), '\\s+', '', 'g')), '');
  v_txn uuid;
begin
  if p_admin_id is null or not exists (
    select 1 from public.profiles where id = p_admin_id and role = 'admin'
  ) then
    raise exception 'actor_not_admin' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'invalid_action';
  end if;

  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'already_decided'; end if;
  if exists (select 1 from public.withdrawal_decisions where request_id = p_request_id) then
    raise exception 'already_decided';
  end if;

  select coalesce(nullif(p.email, ''), a.email) into v_admin_email
    from auth.users a left join public.profiles p on p.id = a.id
   where a.id = p_admin_id;
  if v_admin_email is null or v_admin_email = '' then raise exception 'unknown_admin'; end if;

  if p_action = 'reject' then
    if v_reason is null or length(v_reason) < 3 then raise exception 'reason_required'; end if;
    insert into public.withdrawal_decisions
      (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins)
    values (p_request_id, v_req.user_id, v_req.user_email, 'reject', p_admin_id, v_admin_email, v_reason, v_req.coins);
    update public.withdrawal_requests set status = 'rejected' where id = p_request_id;
    insert into public.admin_audit_log
      (actor_id, actor_email, action, entity, entity_id, target_email, details)
    values (p_admin_id, v_admin_email, 'withdrawal.reject', 'withdrawal_requests', p_request_id, v_req.user_email,
      jsonb_build_object('coins', v_req.coins, 'reason', v_reason));
    return jsonb_build_object('status', 'rejected', 'coins', v_req.coins);
  end if;

  select balance into v_balance from public.wallets where user_id = v_req.user_id for update;
  if v_balance is null or v_balance < v_req.coins then raise exception 'insufficient_balance'; end if;
  v_new_balance := v_balance - v_req.coins;
  update public.wallets set balance = v_new_balance, updated_at = now() where user_id = v_req.user_id;

  insert into public.wallet_transactions (user_id, user_email, type, amount, label, balance_after)
  values (v_req.user_id, v_req.user_email, 'debit', v_req.coins, 'Withdrawal to UPI', v_new_balance)
  returning id into v_txn;

  insert into public.withdrawal_decisions
    (request_id, user_id, user_email, action, admin_id, admin_email, reason, coins, payout_ref, balance_after, wallet_txn_id)
  values (p_request_id, v_req.user_id, v_req.user_email, 'approve', p_admin_id, v_admin_email,
    v_reason, v_req.coins, v_ref, v_new_balance, v_txn);
  update public.withdrawal_requests set status = 'approved' where id = p_request_id;

  insert into public.admin_audit_log
    (actor_id, actor_email, action, entity, entity_id, target_email, details)
  values (p_admin_id, v_admin_email, 'withdrawal.approve', 'withdrawal_requests', p_request_id, v_req.user_email,
    jsonb_build_object('coins', v_req.coins, 'balance_after', v_new_balance, 'payout_ref', v_ref));

  return jsonb_build_object('status', 'approved', 'coins', v_req.coins, 'balance', v_new_balance, 'payout_ref', v_ref);
end;
$$;

revoke all on function public.withdrawal_request_decide(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.withdrawal_request_decide(uuid, uuid, text, text, text) to service_role;
