-- ============================================================
-- 0005 — Saved teammate roster, per-player contact details and
-- the one-slot-per-player rule. Safe to run more than once.
-- ============================================================

-- the player's own WhatsApp number, alongside IGN / UID
alter table public.profiles add column if not exists whatsapp text;

-- a registration now stores the joiner's number and full teammate
-- details (IGN + WhatsApp + UID for every extra player)
alter table public.registrations add column if not exists whatsapp text;
alter table public.registrations add column if not exists teammate_details jsonb not null default '[]'::jsonb;

-- reusable teammate list, owned by the signed-in player
create table if not exists public.teammates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text not null,
  ign text not null,
  whatsapp text not null,
  ff_uid text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teammates_user_email_idx on public.teammates(user_email);

drop trigger if exists teammates_updated_at on public.teammates;
create trigger teammates_updated_at before update on public.teammates
  for each row execute function public.set_updated_at();

alter table public.teammates enable row level security;

-- a player can hold only one joined slot per tournament
create unique index if not exists registrations_one_slot_idx
  on public.registrations (tournament_id, lower(user_email))
  where status = 'joined';