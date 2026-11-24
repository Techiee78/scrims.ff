-- ============================================================
-- Phase 2 security hardening — profile identity fields.
--
-- profiles_update_own lets a player update their own row, and that row carries
-- `email`, which the admin screens, wallet lookups (keyed by email) and the
-- audit trail all trust. A player could rewrite it to someone else's address
-- and impersonate them in the admin panel.
--
-- Same pattern as profiles_guard_role in 0012: silently restore the stored value
-- for anything that is not a server-side (service_role) call.
-- ============================================================

create or replace function public.profiles_guard_email()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.email is distinct from old.email
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_email on public.profiles;
create trigger profiles_guard_email
  before update on public.profiles
  for each row execute function public.profiles_guard_email();

revoke all on function public.profiles_guard_email() from public, anon, authenticated;