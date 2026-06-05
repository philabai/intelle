-- ===========================================================================
-- RegWatch — internal_documents + regulation links (Phase 1 of Asset Mgmt)
-- ---------------------------------------------------------------------------
-- Org-private repository for SOPs, policies, permits, work instructions, etc.
-- Each document carries an owner_user_id who is notified when any linked
-- external regulation changes. Junction table internal_document_regulation_links
-- uses Veeva-style version pinning: each link snapshots a content hash at
-- link time; when the regulation updates, the link is marked superseded and
-- a fresh link row is auto-created against the new version (Phase 3 cron).
--
-- Files live in a private Supabase Storage bucket "regwatch-documents",
-- pathed as <organization_id>/<internal_document_id>/<uuid>-<filename>.
-- Storage RLS uses the first path segment to check org membership.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type regwatch.internal_document_kind as enum (
  'sop',
  'policy',
  'permit',
  'work-instruction',
  'training-material',
  'validation-protocol',
  'risk-assessment',
  'other'
);

create type regwatch.internal_document_status as enum (
  'draft', 'active', 'superseded', 'retired'
);

-- ---------------------------------------------------------------------------
-- internal_documents
-- ---------------------------------------------------------------------------
create table regwatch.internal_documents (
  id                uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references regwatch.organizations(id) on delete cascade,

  title             text not null,
  doc_kind          regwatch.internal_document_kind not null default 'sop',
  internal_code     text,        -- customer's SOP number, e.g. SOP-EHS-014
  version           text,
  effective_date    date,
  next_review_date  date,

  -- Owner is the person notified on linked-regulation changes. owner_role
  -- is a v2 forward-compat field for role-based ownership (assignments
  -- survive personnel turnover) — Phase 1 just collects the value.
  owner_user_id     uuid references auth.users(id) on delete set null,
  owner_role        text,

  description       text,

  -- Supabase Storage metadata
  file_path         text,        -- regwatch-documents/<org>/<doc>/<uuid>-<filename>
  file_name         text,
  file_size         bigint,
  mime_type         text,

  status            regwatch.internal_document_status not null default 'active',

  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index internal_docs_org_idx          on regwatch.internal_documents (organization_id);
create index internal_docs_owner_idx        on regwatch.internal_documents (owner_user_id);
create index internal_docs_org_status_idx   on regwatch.internal_documents (organization_id, status);

create trigger internal_documents_set_updated_at
  before update on regwatch.internal_documents
  for each row execute function regwatch.set_updated_at();

-- ---------------------------------------------------------------------------
-- internal_document_regulation_links
-- ---------------------------------------------------------------------------
create table regwatch.internal_document_regulation_links (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references regwatch.organizations(id) on delete cascade,

  internal_document_id     uuid not null references regwatch.internal_documents(id) on delete cascade,
  regulatory_item_id       uuid not null references regwatch.regulatory_items(id) on delete cascade,
  clause_anchor            text,
  link_rationale           text,

  -- Snapshot of regulatory_items.last_changed_at + a hash of content at link
  -- time, so the link captures "we linked to THIS version". On regulation
  -- update, Phase 3 cron sets superseded_at and creates a fresh row.
  linked_at_item_version   text,

  superseded_at            timestamptz,

  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now()
);

-- One ACTIVE link per (org, doc, regulation, clause). Superseded links
-- accumulate as history.
create unique index internal_docs_link_active_uq
  on regwatch.internal_document_regulation_links
       (organization_id, internal_document_id, regulatory_item_id, coalesce(clause_anchor, ''))
  where superseded_at is null;

create index internal_docs_link_doc_idx
  on regwatch.internal_document_regulation_links (internal_document_id)
  where superseded_at is null;
create index internal_docs_link_reg_idx
  on regwatch.internal_document_regulation_links (regulatory_item_id)
  where superseded_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table regwatch.internal_documents enable row level security;
alter table regwatch.internal_document_regulation_links enable row level security;

drop policy if exists internal_docs_member_read on regwatch.internal_documents;
create policy internal_docs_member_read on regwatch.internal_documents
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_docs_admin_insert on regwatch.internal_documents;
create policy internal_docs_admin_insert on regwatch.internal_documents
  for insert to authenticated
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists internal_docs_admin_update on regwatch.internal_documents;
create policy internal_docs_admin_update on regwatch.internal_documents
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists internal_docs_admin_delete on regwatch.internal_documents;
create policy internal_docs_admin_delete on regwatch.internal_documents
  for delete to authenticated
  using (regwatch.is_org_admin(organization_id));

-- Links: any org member can read; any org member can create/delete (admins
-- control documents, reviewers wire them up).
drop policy if exists internal_docs_link_member_read on regwatch.internal_document_regulation_links;
create policy internal_docs_link_member_read on regwatch.internal_document_regulation_links
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_docs_link_member_insert on regwatch.internal_document_regulation_links;
create policy internal_docs_link_member_insert on regwatch.internal_document_regulation_links
  for insert to authenticated
  with check (regwatch.is_org_member(organization_id));

drop policy if exists internal_docs_link_member_update on regwatch.internal_document_regulation_links;
create policy internal_docs_link_member_update on regwatch.internal_document_regulation_links
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_member(organization_id));

drop policy if exists internal_docs_link_member_delete on regwatch.internal_document_regulation_links;
create policy internal_docs_link_member_delete on regwatch.internal_document_regulation_links
  for delete to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on regwatch.internal_documents to authenticated;
grant insert, update, delete on regwatch.internal_documents to authenticated;
grant select on regwatch.internal_document_regulation_links to authenticated;
grant insert, update, delete on regwatch.internal_document_regulation_links to authenticated;

-- ===========================================================================
-- Supabase Storage — regwatch-documents bucket
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('regwatch-documents', 'regwatch-documents', false)
on conflict (id) do nothing;

-- Storage RLS — folder name [1] is the organization_id; check membership.
drop policy if exists regwatch_docs_member_select on storage.objects;
create policy regwatch_docs_member_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'regwatch-documents'
    and (storage.foldername(name))[1] is not null
    and regwatch.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists regwatch_docs_member_insert on storage.objects;
create policy regwatch_docs_member_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'regwatch-documents'
    and (storage.foldername(name))[1] is not null
    and regwatch.is_org_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists regwatch_docs_admin_delete on storage.objects;
create policy regwatch_docs_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'regwatch-documents'
    and (storage.foldername(name))[1] is not null
    and regwatch.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
