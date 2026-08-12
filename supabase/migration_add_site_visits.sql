-- Run once against the already-deployed database (schema.sql already has this
-- for fresh installs). Adds a single-row visit counter incremented via RPC.
create table if not exists site_visits (
  id smallint primary key default 1,
  count bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint site_visits_singleton check (id = 1)
);

insert into site_visits (id, count) values (1, 0) on conflict (id) do nothing;

alter table site_visits enable row level security;

drop policy if exists "public read site_visits" on site_visits;
create policy "public read site_visits" on site_visits for select using (true);

create or replace function increment_site_visits()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update site_visits set count = count + 1, updated_at = now() where id = 1
  returning count into new_count;
  return new_count;
end;
$$;

grant execute on function increment_site_visits() to anon, authenticated;
