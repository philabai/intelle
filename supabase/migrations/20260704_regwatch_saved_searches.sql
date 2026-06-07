-- ===========================================================================
-- Vantage — Saved searches
-- ---------------------------------------------------------------------------
-- Per-user catalogue of saved corpus queries. Surfaced on /regwatch/saved
-- (replaces the coming-soon shell). One row per saved query; label is
-- optional ("How does CBAM apply to imports?" → user can rename).
-- ===========================================================================

create table regwatch.saved_searches (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  organization_id     uuid references regwatch.organizations(id) on delete cascade,

  query               text not null,
  label               text,
  -- Future-proof: filters jsonb so faceted searches (jurisdiction, topic
  -- etc.) can attach without a schema bump.
  filters             jsonb not null default '{}'::jsonb,
  -- Snapshot of how many corpus rows matched at save time. Useful for the
  -- list view to show stale-result badges.
  result_count_at_save int,
  last_run_at         timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- One save per (user, normalised query) — re-saving updates the timestamp
-- rather than creating a duplicate row.
create unique index saved_searches_user_query_uq
  on regwatch.saved_searches (user_id, lower(query));
create index saved_searches_user_idx
  on regwatch.saved_searches (user_id, created_at desc);

create trigger saved_searches_set_updated_at
  before update on regwatch.saved_searches
  for each row execute function regwatch.set_updated_at();

alter table regwatch.saved_searches enable row level security;

drop policy if exists saved_searches_owner_read on regwatch.saved_searches;
create policy saved_searches_owner_read on regwatch.saved_searches
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists saved_searches_owner_insert on regwatch.saved_searches;
create policy saved_searches_owner_insert on regwatch.saved_searches
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists saved_searches_owner_update on regwatch.saved_searches;
create policy saved_searches_owner_update on regwatch.saved_searches
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists saved_searches_owner_delete on regwatch.saved_searches;
create policy saved_searches_owner_delete on regwatch.saved_searches
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on regwatch.saved_searches to authenticated;
grant all on regwatch.saved_searches to service_role;
