-- ===========================================================================
-- RegWatch — Project folders for internal documents
-- ---------------------------------------------------------------------------
-- Lets users organise internal_documents into a tree of folders (top-level
-- folders act as "projects"). Self-referential by `parent_id`; a NULL
-- parent_id means a top-level folder. Documents either sit inside a folder
-- (folder_id set) or in the org's "Unfiled" pseudo-root (folder_id NULL).
--
-- RLS: members read; admins create / rename / archive folders; any member
-- can move documents between folders (admin-only document creation still
-- enforced via internal_documents RLS, unchanged).
-- ===========================================================================

create table regwatch.internal_document_folders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references regwatch.organizations(id) on delete cascade,
  parent_id       uuid references regwatch.internal_document_folders(id) on delete cascade,

  name            text not null,
  description     text,
  -- Slug used in URLs; we let admins type their own or derive from name.
  slug            text,

  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  archived_at     timestamptz
);

-- Prevent two siblings with the same display name. The COALESCE turns the
-- nullable parent_id into a sentinel so top-level folders are also dedup'd.
create unique index internal_doc_folders_sibling_uq
  on regwatch.internal_document_folders (
    organization_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  )
  where archived_at is null;

create index internal_doc_folders_org_idx
  on regwatch.internal_document_folders (organization_id);
create index internal_doc_folders_parent_idx
  on regwatch.internal_document_folders (parent_id);

create trigger internal_document_folders_set_updated_at
  before update on regwatch.internal_document_folders
  for each row execute function regwatch.set_updated_at();

-- ---------------------------------------------------------------------------
-- Add folder_id to internal_documents
-- ---------------------------------------------------------------------------
alter table regwatch.internal_documents
  add column if not exists folder_id uuid
    references regwatch.internal_document_folders(id) on delete set null;

create index if not exists internal_documents_folder_idx
  on regwatch.internal_documents (folder_id) where folder_id is not null;
create index if not exists internal_documents_org_folder_idx
  on regwatch.internal_documents (organization_id, folder_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table regwatch.internal_document_folders enable row level security;

drop policy if exists internal_doc_folders_member_read on regwatch.internal_document_folders;
create policy internal_doc_folders_member_read on regwatch.internal_document_folders
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_folders_admin_insert on regwatch.internal_document_folders;
create policy internal_doc_folders_admin_insert on regwatch.internal_document_folders
  for insert to authenticated
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists internal_doc_folders_admin_update on regwatch.internal_document_folders;
create policy internal_doc_folders_admin_update on regwatch.internal_document_folders
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists internal_doc_folders_admin_delete on regwatch.internal_document_folders;
create policy internal_doc_folders_admin_delete on regwatch.internal_document_folders
  for delete to authenticated
  using (regwatch.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Grants — explicit per the new-table-grant rule
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on regwatch.internal_document_folders to authenticated;
grant all on regwatch.internal_document_folders to service_role;
