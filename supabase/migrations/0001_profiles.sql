-- Ascend initial schema: user profiles and businesses.
-- Run in the Supabase SQL editor, or with the Supabase CLI (supabase db push).

-- Profiles ----------------------------------------------------------------
-- One row per auth user. Sign-up metadata (full_name, business_name) is copied
-- in by a trigger so the app never has to write to auth.users directly.
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  business_name text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'business_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Businesses --------------------------------------------------------------
-- The unit the model is trained on. Dashboard data will hang off this table
-- (data sources, uploads, forecasts, opportunities) in later migrations.
create table if not exists public.businesses (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  industry   text,
  location   text,
  created_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);

alter table public.businesses enable row level security;

create policy "Owners can read their businesses"
  on public.businesses for select
  using (auth.uid() = owner_id);

create policy "Owners can create businesses"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their businesses"
  on public.businesses for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Owners can delete their businesses"
  on public.businesses for delete
  using (auth.uid() = owner_id);

-- Grants ------------------------------------------------------------------
-- Needed when "Automatically expose new tables" is disabled for the project.
-- Row Level Security above still decides which rows each user can touch.
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.businesses to authenticated;
