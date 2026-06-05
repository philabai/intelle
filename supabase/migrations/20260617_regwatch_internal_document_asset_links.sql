-- ===========================================================================
-- RegWatch — internal_document_asset_links
-- ---------------------------------------------------------------------------
-- Pin an internal document (SOP / policy / permit / etc.) to one or more
-- assets in the hierarchy. Mirrors internal_document_regulation_links but
-- the other side is an asset, not a regulation.
--
-- Why a separate table from internal_document_regulation_links?
--   Different semantics (asset doesn't supersede), different RLS shape
--   (no version pinning), and the natural fan-out is different (one doc
--   typically attaches to many assets; one doc rarely attaches to many
--   regulations the same way).
-- ===========================================================================

create table regwatch.internal_document_asset_links (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references regwatch.organizations(id) on delete cascade,

  internal_document_id     uuid not null references regwatch.internal_documents(id) on delete cascade,
  asset_id                 uuid not null references regwatch.assets(id) on delete cascade,
  link_rationale           text,

  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),

  -- One link per (org, doc, asset) tuple.
  unique (organization_id, internal_document_id, asset_id)
);

create index internal_doc_asset_doc_idx
  on regwatch.internal_document_asset_links (internal_document_id);
create index internal_doc_asset_asset_idx
  on regwatch.internal_document_asset_links (asset_id);

-- ---------------------------------------------------------------------------
-- RLS — any org member can read; any org member can wire links up. (Document
-- creation itself stays admin-only via internal_documents policies.)
-- ---------------------------------------------------------------------------
alter table regwatch.internal_document_asset_links enable row level security;

drop policy if exists internal_doc_asset_member_read on regwatch.internal_document_asset_links;
create policy internal_doc_asset_member_read on regwatch.internal_document_asset_links
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_asset_member_insert on regwatch.internal_document_asset_links;
create policy internal_doc_asset_member_insert on regwatch.internal_document_asset_links
  for insert to authenticated
  with check (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_asset_member_delete on regwatch.internal_document_asset_links;
create policy internal_doc_asset_member_delete on regwatch.internal_document_asset_links
  for delete to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Grants — both authenticated AND service_role (see feedback memory:
-- the schema-wide grant in 20260602 doesn't cascade to later tables).
-- ---------------------------------------------------------------------------
grant select, insert, delete on regwatch.internal_document_asset_links to authenticated;
grant all on regwatch.internal_document_asset_links to service_role;
