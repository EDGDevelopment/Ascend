-- Uploaded datasets: each spreadsheet a client uploads, with its details and the latest computed result.
-- Replaces the one-row-per-user valuation_models table from 0002, which is left in place but unused.

create table if not exists public.valuation_datasets (
  id          uuid primary key,
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  file_name   text,
  input       jsonb not null,
  output      jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists valuation_datasets_owner_idx on public.valuation_datasets (owner_id, created_at desc);

alter table public.valuation_datasets enable row level security;

create policy "Owners can read their datasets"
  on public.valuation_datasets for select
  using (auth.uid() = owner_id);

create policy "Owners can create their datasets"
  on public.valuation_datasets for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their datasets"
  on public.valuation_datasets for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their datasets"
  on public.valuation_datasets for delete
  using (auth.uid() = owner_id);

grant select, insert, update, delete on public.valuation_datasets to authenticated;
