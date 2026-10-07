-- ============================================================
-- Coin top-up orders (Razorpay). Tracks each top-up lifecycle:
-- created -> paid (verified) | failed.
-- 1 coin = 1 INR. amount_inr mirrors coins for clarity in reports.
-- ============================================================

create table if not exists public.coin_topups (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  coins integer not null,
  amount_inr numeric not null,
  order_id text,
  payment_id text,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coin_topups_user_email_idx on public.coin_topups(user_email);
create unique index if not exists coin_topups_order_id_idx on public.coin_topups(order_id);

-- updated_at trigger
drop trigger if exists coin_topups_updated_at on public.coin_topups;
create trigger coin_topups_updated_at before update on public.coin_topups
  for each row execute function public.set_updated_at();

-- RLS: enabled, no policies => only service_role (backend functions) access.
alter table public.coin_topups enable row level security;