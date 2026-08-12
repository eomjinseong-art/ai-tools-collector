-- Run once against the already-deployed database (schema.sql already has this
-- for fresh installs). Adds category click tracking for the 3-panel app's
-- left-hand menu ordering.
alter table categories add column if not exists click_count bigint not null default 0;

create or replace function increment_category_clicks(p_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  update categories set click_count = click_count + 1 where slug = p_slug
  returning click_count into new_count;
  return new_count;
end;
$$;

grant execute on function increment_category_clicks(text) to anon, authenticated;
