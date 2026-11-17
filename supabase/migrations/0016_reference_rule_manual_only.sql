-- 0016 — The 12-digit UTR rule only applies to manual UPI deposits.
--
-- Automatic (NexUPI) orders carry their own alphanumeric order id in
-- `reference`, so the old table-wide rule rejected them. Manual requests keep
-- the exact 12-digit requirement; existing rows are not re-validated.

begin;

alter table public.deposit_requests
  drop constraint if exists deposit_requests_reference_12_digits;

alter table public.deposit_requests
  add constraint deposit_requests_reference_12_digits
  check (provider <> 'manual' or reference ~ '^[0-9]{12}$') not valid;

commit;