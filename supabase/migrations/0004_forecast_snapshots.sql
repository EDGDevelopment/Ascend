-- Forecast track record: each forecast's revenue range is kept on its dataset so it can be scored against real months later.
-- Goals the owner is tracking are kept the same way.
-- Covered by the existing Row Level Security policies on valuation_datasets.

alter table public.valuation_datasets
  add column if not exists snapshots jsonb not null default '[]'::jsonb;

alter table public.valuation_datasets
  add column if not exists goals jsonb not null default '[]'::jsonb;
