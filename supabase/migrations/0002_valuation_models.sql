-- Valuation models: the client's DCF inputs and the latest computed output.
-- One row per user. The dashboards read `output` to drive the revenue outlook.

create table if not exists public.valuation_models (
  owner_id    uuid primary key references auth.users (id) on delete cascade,
  input       jsonb not null,
  output      jsonb,
  computed_at timestamptz,
  updated_at  timestamptz not null default now()
);

alter table public.valuation_models enable row level security;

create policy "Owners can read their valuation model"
  on public.valuation_models for select
  using (auth.uid() = owner_id);

create policy "Owners can create their valuation model"
  on public.valuation_models for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their valuation model"
  on public.valuation_models for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their valuation model"
  on public.valuation_models for delete
  using (auth.uid() = owner_id);

drop trigger if exists valuation_models_set_updated_at on public.valuation_models;
create trigger valuation_models_set_updated_at
  before update on public.valuation_models
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.valuation_models to authenticated;
