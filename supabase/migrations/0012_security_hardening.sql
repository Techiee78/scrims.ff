-- Security hardening (applied to the live project).
--
-- 1. Money/admin RPCs must never be callable straight from the browser with the
--    anon/authenticated key: they take a user id from the caller, so a signed-in
--    visitor could create a withdrawal for someone else and approve it. They are
--    only used by the Edge Functions, which call them with the service_role key.
revoke all on function public.withdrawal_request_create(uuid, integer, text, text, text) from public, anon, authenticated;
revoke all on function public.withdrawal_request_decide(uuid, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.deposit_request_create(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.deposit_request_decide(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.wallet_test_topup_create(uuid, integer) from public, anon, authenticated;
revoke all on function public.wallet_test_topup_confirm(uuid, text) from public, anon, authenticated;
revoke all on function public.wallet_test_topup_fail(uuid, text) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.fill_money_user_id() from public, anon, authenticated;

-- 2. A player can update their own profile row, which also carries `role`.
--    Without this guard anyone could promote themselves to admin through the
--    REST API. Role changes are only allowed from server-side (service_role)
--    calls such as the manageUsers Edge Function.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

revoke all on function public.profiles_guard_role() from public, anon, authenticated;