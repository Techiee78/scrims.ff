-- Security hardening 2 (applied to the live project).
--
-- 1. `tournaments` carried room_id / room_password and anon + authenticated had
--    table-level SELECT on it, so anyone holding the public anon key could read
--    the room details of every upcoming match — no login and no entry fee. Only
--    the public board columns may be readable; room details come from
--    getMyRegistrations (service_role, joined players only).
revoke select on table public.tournaments from anon, authenticated;
grant select (
  id,
  title,
  description,
  mode,
  team_type,
  map,
  map_name,
  entry_fee,
  prize_pool,
  per_kill,
  prize_1st,
  prize_2nd,
  prize_3rd,
  match_time,
  start_time,
  total_slots,
  max_slots,
  filled_slots,
  banner_url,
  status,
  featured,
  created_at,
  updated_at
) on table public.tournaments to anon, authenticated;

-- 2. The auto-RLS event-trigger helper is not an API function; nobody in the
--    browser should be able to call it.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;