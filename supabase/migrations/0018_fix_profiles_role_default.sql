-- ============================================================
-- 0018 — Fix: every new signup was being created as an admin.
--
-- The live profiles table had role default 'admin', so the
-- handle_new_user trigger (which does not set role) gave every
-- new account admin rights. The column default is now 'user'.
--
-- The 0012 guard only protected UPDATE, so a signed-in user
-- could still INSERT their own profile row with role='admin'
-- if their row was missing. The same guard now covers INSERT.
-- ============================================================

alter table public.profiles alter column role set default 'user';

create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    if tg_op = 'INSERT' then
      new.role := 'user';
    elsif new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_insert on public.profiles;
create trigger profiles_guard_role_insert
  before insert on public.profiles
  for each row execute function public.profiles_guard_role();

revoke all on function public.profiles_guard_role() from public, anon, authenticated;