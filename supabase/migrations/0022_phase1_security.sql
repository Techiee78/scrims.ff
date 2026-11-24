-- ============================================================
-- Phase 1 security hardening — authentication, admin & privilege escalation.
--
-- Apply with: supabase db push   (or paste into the SQL editor)
--
-- 1. Single-admin policy, enforced in the database (max one row with
--    role = 'admin'). The only way to change the admin is the atomic
--    admin_transfer_admin() RPC below.
-- 2. Every role change is written to public.admin_audit_log by a trigger, so
--    the trail exists even for changes made outside the Edge Functions.
-- 3. admin_audit_log stays unreachable for app users (RLS on, no policies,
--    no grants to anon/authenticated).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Single-admin policy
-- ------------------------------------------------------------
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_other_admins int;
begin
  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      select count(*) into v_other_admins from public.profiles where role = 'admin';
      if v_other_admins > 0 then
        raise exception 'single_admin_policy: an admin already exists' using errcode = 'P0001';
      end if;
    end if;
    return new;
  end if;

  if new.role is not distinct from old.role then
    return new;
  end if;

  if new.role = 'admin' then
    select count(*) into v_other_admins
      from public.profiles
     where role = 'admin' and id <> new.id;
    if v_other_admins > 0 then
      raise exception 'single_admin_policy: an admin already exists' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

-- Fires after profiles_guard_role (alphabetical order), so a role change made
-- by a regular user is already reverted before this check runs.
drop trigger if exists profiles_single_admin on public.profiles;
create trigger profiles_single_admin
  before insert or update on public.profiles
  for each row execute function public.enforce_single_admin();

revoke all on function public.enforce_single_admin() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2. Role-change audit trail
-- ------------------------------------------------------------
create or replace function public.audit_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_actor uuid;
  v_actor_email text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Actor identity set by the RPCs below in the same transaction.
  begin
    v_actor := nullif(current_setting('app.actor_id', true), '')::uuid;
  exception when others then
    v_actor := null;
  end;

  if v_actor is null then
    begin
      v_actor := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    exception when others then
      v_actor := null;
    end;
  end if;

  v_actor_email := nullif(current_setting('app.actor_email', true), '');
  if v_actor_email is null then
    v_actor_email := 'system:' || current_user;
  end if;

  insert into public.admin_audit_log (
    actor_id, actor_email, action, entity, entity_id, target_email, details
  ) values (
    v_actor,
    v_actor_email,
    'user.role_change',
    'profile',
    new.id,
    new.email,
    jsonb_build_object(
      'old_role', old.role,
      'new_role', new.role,
      'outcome', 'applied',
      'source', 'database'
    )
  );

  return new;
end;
$$;

drop trigger if exists profiles_audit_role_change on public.profiles;
create trigger profiles_audit_role_change
  after update on public.profiles
  for each row execute function public.audit_profile_role_change();

revoke all on function public.audit_profile_role_change() from public, anon, authenticated;

-- ------------------------------------------------------------
-- 3. Audited role-change RPCs (service_role only — called by the
--    manageUsers Edge Function, never from the browser).
-- ------------------------------------------------------------
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
  v_old_role text;
  v_target_email text;
begin
  if p_new_role is null or p_new_role not in ('admin', 'user') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if p_target_id is null then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;
  if p_actor_id is not null and p_actor_id = p_target_id and p_new_role <> 'admin' then
    raise exception 'self_demotion_blocked' using errcode = 'P0001';
  end if;

  select role, email into v_old_role, v_target_email
    from public.profiles where id = p_target_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  perform set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.actor_email', coalesce(p_actor_email, ''), true);

  update public.profiles
     set role = p_new_role, updated_at = now()
   where id = p_target_id;

  return jsonb_build_object(
    'id', p_target_id,
    'email', v_target_email,
    'old_role', v_old_role,
    'new_role', p_new_role
  );
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_user_role(uuid, text, uuid, text) to service_role;

-- Atomic hand-over: the current admin drops to 'user' and the target becomes
-- the admin in one transaction, so the single-admin rule is never violated.
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
  v_target_role text;
  v_target_email text;
begin
  if p_actor_id is null or p_target_id is null or p_actor_id = p_target_id then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;

  select role into v_actor_role from public.profiles where id = p_actor_id;
  if v_actor_role is distinct from 'admin' then
    raise exception 'actor_not_admin' using errcode = 'P0001';
  end if;

  select role, email into v_target_role, v_target_email
    from public.profiles where id = p_target_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  perform set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.actor_email', coalesce(p_actor_email, ''), true);

  update public.profiles set role = 'user', updated_at = now() where id = p_actor_id;
  update public.profiles set role = 'admin', updated_at = now() where id = p_target_id;

  return jsonb_build_object(
    'from_id', p_actor_id,
    'to_id', p_target_id,
    'to_email', v_target_email,
    'previous_role', v_target_role
  );
end;
$$;

revoke all on function public.admin_transfer_admin(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_transfer_admin(uuid, text, uuid) to service_role;

-- ------------------------------------------------------------
-- 4. Keep the audit trail private
-- ------------------------------------------------------------
alter table public.admin_audit_log enable row level security;
revoke all on table public.admin_audit_log from public, anon, authenticated;