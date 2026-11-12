-- Prize pool is now split across 1st / 2nd / 3rd place, and per-kill rewards
-- are paid out of the same pool. Existing matches keep paying the whole pool
-- to 1st place until the organizer sets a split.
alter table public.tournaments
  add column if not exists prize_1st numeric not null default 0,
  add column if not exists prize_2nd numeric not null default 0,
  add column if not exists prize_3rd numeric not null default 0;

update public.tournaments
set prize_1st = prize_pool
where prize_1st = 0
  and prize_2nd = 0
  and prize_3rd = 0
  and prize_pool > 0;