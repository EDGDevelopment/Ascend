-- Read-only share links. Each row is a frozen copy of one dataset's report, found by a long random token.
-- Signed-out visitors cannot read this table. They call get_shared_report(), which returns one payload for
-- one exact token and nothing else, so links cannot be listed or guessed at.

create table if not exists public.shared_reports (
  token       text primary key check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  payload     jsonb not null check (octet_length(payload::text) < 4000000),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);

create index if not exists shared_reports_owner_idx on public.shared_reports (owner_id, created_at desc);

alter table public.shared_reports enable row level security;

create policy "Owners can read their share links"
  on public.shared_reports for select
  using (auth.uid() = owner_id);

create policy "Owners can create share links"
  on public.shared_reports for insert
  with check (auth.uid() = owner_id);

create policy "Owners can delete their share links"
  on public.shared_reports for delete
  using (auth.uid() = owner_id);

grant select, insert, delete on public.shared_reports to authenticated;

create or replace function public.get_shared_report(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select payload
  from public.shared_reports
  where token = p_token
    and (expires_at is null or expires_at > now())
$$;

revoke all on function public.get_shared_report(text) from public;
grant execute on function public.get_shared_report(text) to anon, authenticated;
