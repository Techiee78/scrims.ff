-- Phase 2: serialize admin promotion/creation to close the concurrent insert race.
create or replace function public.enforce_single_admin()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_other_admins int;
begin
  -- All admin insert/promote paths take the same transaction lock before counting.
  if (tg_op = 'INSERT' and new.role = 'admin')
     or (tg_op = 'UPDATE' and new.role = 'admin' and new.role is distinct from old.role) then
    perform pg_advisory_xact_lock(71420531, 991);
  end if;

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
revoke all on function public.enforce_single_admin() from public, anon, authenticated;