-- ===========================================================================
-- RegWatch — Internal Documents v2 foundations
-- ---------------------------------------------------------------------------
-- Schema additions for: in-app TipTap editor (body_doc), review workflow
-- state machine, immutable revision history, e-signature manifest, comment
-- threads, audit-event log, and template registry.
--
-- This migration is UI-invisible. It lays the schema; the UI changes ride
-- in PR-2 (editor + revisions), PR-3 (gallery + templates), PR-4 (review +
-- signatures), PR-5 (compose), PR-6 (comments + export).
--
-- All grants go to BOTH authenticated AND service_role per the
-- feedback memory "every new regwatch.* table needs explicit grants to
-- BOTH authenticated AND service_role; schema-wide grant in 20260602
-- doesn't cascade".
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- New enums
-- ---------------------------------------------------------------------------

-- Workflow state machine: draft → in_review → approved → effective →
-- superseded. The existing internal_document_status enum (active/retired)
-- stays as the kind-agnostic lifecycle axis. Two columns, two purposes.
create type regwatch.internal_document_review_state as enum (
  'draft',
  'in_review',
  'approved',
  'effective',
  'superseded'
);

-- Each revision is either editor-authored (body_doc set) OR file-uploaded
-- (file_path set). Hybrid sits at the revision level, not the doc level —
-- the doc's current_revision_id picks what users see.
create type regwatch.internal_document_revision_type as enum (
  'editor',
  'upload'
);

-- Review assignment roles.
create type regwatch.internal_document_review_role as enum (
  'owner',
  'reviewer',
  'approver'
);

-- E-signature meaning per 21 CFR Part 11 / EU Annex 11. Stored in the
-- signature row alongside the signer's name + timestamp.
create type regwatch.internal_document_signature_meaning as enum (
  'authored',
  'reviewed',
  'approved'
);

-- Audit event types — append-only stream surfaced in the per-doc audit panel.
create type regwatch.internal_document_audit_event_type as enum (
  'created',
  'updated_metadata',
  'revision_saved',
  'revision_committed',
  'uploaded_file',
  'submitted_for_review',
  'reviewer_assigned',
  'approver_assigned',
  'reviewer_completed',
  'changes_requested',
  'approved',
  'marked_effective',
  'superseded',
  'retired',
  'comment_added',
  'comment_resolved',
  'citation_inserted',
  'citation_flagged_stale'
);

-- Version bump granularity, picked by the author at save time.
--   major — breaking content change; obligations / linked-regulation impact
--   minor — meaningful content change; reviewers should re-look
--   patch — typo / formatting / non-substantive (skips re-review in v2)
create type regwatch.internal_document_version_bump as enum (
  'major',
  'minor',
  'patch'
);

-- ---------------------------------------------------------------------------
-- Alter internal_documents — new authoring + workflow columns
-- ---------------------------------------------------------------------------
alter table regwatch.internal_documents
  add column body_doc jsonb,
  add column template_key text,
  add column current_revision_id uuid,
  add column review_state regwatch.internal_document_review_state
    not null default 'draft';

-- A tsvector that drives unified search across both editor-authored bodies
-- (body_doc) and upload-extracted bodies. We can't index ProseMirror JSON
-- directly cheaply, so callers update body_text_cached via the
-- saveDraftRevision action when body_doc changes; the tsvector is generated
-- from that text column.
alter table regwatch.internal_documents
  add column body_text_cached text,
  add column body_search tsvector generated always as
    (to_tsvector('english', coalesce(body_text_cached, ''))) stored;

create index internal_docs_body_search_idx
  on regwatch.internal_documents using gin (body_search);
create index internal_docs_review_state_idx
  on regwatch.internal_documents (organization_id, review_state);
create index internal_docs_template_key_idx
  on regwatch.internal_documents (template_key);

-- ---------------------------------------------------------------------------
-- internal_document_templates — registry mirror of the code-side TEMPLATE_REGISTRY
-- ---------------------------------------------------------------------------
-- Code is the source of truth (src/lib/regwatch/templates/registry.ts).
-- The seed migration 20260626 upserts every template; deploys re-run the
-- upsert so registry changes propagate.
create table regwatch.internal_document_templates (
  key            text primary key,
  label          text not null,
  description    text,
  family         text not null,  -- e.g. 'osha-psm', 'iso-9001', '21cfr820', 'nasa-llis', 'ieee-829', 'generic'
  doc_kind       regwatch.internal_document_kind not null,
  prosemirror_json jsonb not null,
  default_metadata jsonb not null default '{}'::jsonb,
  sort_order     int not null default 100,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index internal_doc_templates_family_idx
  on regwatch.internal_document_templates (family, sort_order)
  where active;
create index internal_doc_templates_kind_idx
  on regwatch.internal_document_templates (doc_kind);

create trigger internal_doc_templates_set_updated_at
  before update on regwatch.internal_document_templates
  for each row execute function regwatch.set_updated_at();

-- Templates are global (no org_id); anyone authenticated can read.
alter table regwatch.internal_document_templates enable row level security;

drop policy if exists internal_doc_templates_read on regwatch.internal_document_templates;
create policy internal_doc_templates_read on regwatch.internal_document_templates
  for select to authenticated
  using (active);

grant select on regwatch.internal_document_templates to authenticated;
grant all on regwatch.internal_document_templates to service_role;

-- ---------------------------------------------------------------------------
-- internal_document_revisions — immutable revision history
-- ---------------------------------------------------------------------------
-- Each revision is either editor-authored (body_doc set) OR upload-type
-- (file_path / file_name / file_size / mime_type set). Enforced via CHECK.
-- Revisions are insert-only; existing rows are never updated or deleted.
create table regwatch.internal_document_revisions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references regwatch.organizations(id) on delete cascade,
  internal_document_id   uuid not null references regwatch.internal_documents(id) on delete cascade,

  revision_number        int not null,
  revision_type          regwatch.internal_document_revision_type not null,

  -- Explicit semver. Author picks major/minor/patch at save time; the
  -- save action computes the next (major, minor, patch) tuple from the
  -- previous revision's tuple and the bump choice. v1 of any doc is
  -- (0, 1, 0). Patch increments minor unchanged; minor zeros patch;
  -- major zeros minor and patch.
  version_major          int not null,
  version_minor          int not null,
  version_patch          int not null default 0,
  version_bump           regwatch.internal_document_version_bump not null,

  -- Editor-type fields
  body_doc               jsonb,
  body_text              text,

  -- Upload-type fields
  file_path              text,
  file_name              text,
  file_size              bigint,
  mime_type              text,

  reason_for_change      text not null,
  is_committed           boolean not null default false,

  created_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),

  -- Editor revisions must have body_doc set and file_* null; upload
  -- revisions are the inverse. Enforces the XOR cleanly.
  constraint internal_doc_revisions_type_xor check (
    (revision_type = 'editor'
       and body_doc is not null
       and file_path is null)
    or
    (revision_type = 'upload'
       and file_path is not null
       and body_doc is null)
  ),

  -- One revision_number per doc.
  unique (internal_document_id, revision_number),
  -- One semver per doc — guard against accidental double-save races at
  -- the same version.
  unique (internal_document_id, version_major, version_minor, version_patch)
);

create index internal_doc_revisions_doc_idx
  on regwatch.internal_document_revisions (internal_document_id, revision_number desc);
create index internal_doc_revisions_org_idx
  on regwatch.internal_document_revisions (organization_id);
create index internal_doc_revisions_committed_idx
  on regwatch.internal_document_revisions (internal_document_id, is_committed)
  where is_committed;

alter table regwatch.internal_document_revisions enable row level security;

drop policy if exists internal_doc_revisions_read on regwatch.internal_document_revisions;
create policy internal_doc_revisions_read on regwatch.internal_document_revisions
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_revisions_insert on regwatch.internal_document_revisions;
create policy internal_doc_revisions_insert on regwatch.internal_document_revisions
  for insert to authenticated
  with check (regwatch.is_org_member(organization_id));

-- No update / delete policies — revisions are immutable.

grant select, insert on regwatch.internal_document_revisions to authenticated;
grant all on regwatch.internal_document_revisions to service_role;

-- Now that the table exists we can wire the FK on internal_documents.
alter table regwatch.internal_documents
  add constraint internal_docs_current_revision_fk
    foreign key (current_revision_id)
    references regwatch.internal_document_revisions(id)
    on delete set null;

-- ---------------------------------------------------------------------------
-- internal_document_signatures — Part 11 / Annex 11 e-signature manifest
-- ---------------------------------------------------------------------------
-- Signatures bind a (doc, revision, user) to a meaning (authored / reviewed
-- / approved). They are inserted only via the user client (not service-role
-- bypass) so the signer's identity is provable in Postgres logs.
-- Immutable: insert-only, never updated or deleted.
create table regwatch.internal_document_signatures (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references regwatch.organizations(id) on delete cascade,
  internal_document_id   uuid not null references regwatch.internal_documents(id) on delete cascade,
  revision_id            uuid not null references regwatch.internal_document_revisions(id) on delete cascade,

  signer_user_id         uuid not null references auth.users(id) on delete set null,
  meaning                regwatch.internal_document_signature_meaning not null,
  signed_at              timestamptz not null default now(),

  -- Snapshots for audit-trail printouts (Annex 11 requires the printout
  -- to be self-contained — the user's display name at sign time must
  -- survive a later name change).
  display_name_snapshot  text not null,
  email_snapshot         text,

  -- Forensic + re-auth fields
  ip_address             inet,
  user_agent             text,
  -- Set when the signer was re-prompted for password within the 15-min
  -- recency window. Null when relying on session recency alone.
  password_reverified_at timestamptz
);

create index internal_doc_sigs_doc_idx
  on regwatch.internal_document_signatures (internal_document_id);
create index internal_doc_sigs_signer_idx
  on regwatch.internal_document_signatures (signer_user_id);

alter table regwatch.internal_document_signatures enable row level security;

drop policy if exists internal_doc_sigs_read on regwatch.internal_document_signatures;
create policy internal_doc_sigs_read on regwatch.internal_document_signatures
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

-- Signers insert only their own rows.
drop policy if exists internal_doc_sigs_insert on regwatch.internal_document_signatures;
create policy internal_doc_sigs_insert on regwatch.internal_document_signatures
  for insert to authenticated
  with check (
    regwatch.is_org_member(organization_id)
    and signer_user_id = auth.uid()
  );

grant select, insert on regwatch.internal_document_signatures to authenticated;
grant all on regwatch.internal_document_signatures to service_role;

-- ---------------------------------------------------------------------------
-- internal_document_review_assignments — who reviews / approves what
-- ---------------------------------------------------------------------------
-- Role-based assignment per Veeva pattern (Owner, Reviewer, Approver).
-- Mutable completed_at; rest of the row is effectively immutable.
create table regwatch.internal_document_review_assignments (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references regwatch.organizations(id) on delete cascade,
  internal_document_id   uuid not null references regwatch.internal_documents(id) on delete cascade,

  user_id                uuid not null references auth.users(id) on delete cascade,
  role                   regwatch.internal_document_review_role not null,

  assigned_by            uuid references auth.users(id) on delete set null,
  assigned_at            timestamptz not null default now(),
  completed_at           timestamptz,

  -- One active assignment per (doc, user, role). Re-assignment after
  -- completion is allowed via insert of a fresh row.
  unique (internal_document_id, user_id, role, completed_at)
);

create index internal_doc_assignments_doc_idx
  on regwatch.internal_document_review_assignments (internal_document_id);
create index internal_doc_assignments_user_open_idx
  on regwatch.internal_document_review_assignments (user_id)
  where completed_at is null;

alter table regwatch.internal_document_review_assignments enable row level security;

drop policy if exists internal_doc_assignments_read on regwatch.internal_document_review_assignments;
create policy internal_doc_assignments_read on regwatch.internal_document_review_assignments
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_assignments_insert on regwatch.internal_document_review_assignments;
create policy internal_doc_assignments_insert on regwatch.internal_document_review_assignments
  for insert to authenticated
  with check (regwatch.is_org_admin(organization_id));

-- completed_at can be updated by the assignee themselves OR by an admin.
drop policy if exists internal_doc_assignments_update on regwatch.internal_document_review_assignments;
create policy internal_doc_assignments_update on regwatch.internal_document_review_assignments
  for update to authenticated
  using (
    regwatch.is_org_member(organization_id)
    and (user_id = auth.uid() or regwatch.is_org_admin(organization_id))
  )
  with check (regwatch.is_org_member(organization_id));

grant select, insert, update on regwatch.internal_document_review_assignments to authenticated;
grant all on regwatch.internal_document_review_assignments to service_role;

-- ---------------------------------------------------------------------------
-- internal_document_comments — review-time comment threads
-- ---------------------------------------------------------------------------
-- Anchored to a paragraph / clause / ProseMirror range. Mutable resolved_at
-- + resolved_by. Body is immutable once posted (no edit-history table in v1).
create table regwatch.internal_document_comments (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references regwatch.organizations(id) on delete cascade,
  internal_document_id   uuid not null references regwatch.internal_documents(id) on delete cascade,
  revision_id            uuid references regwatch.internal_document_revisions(id) on delete set null,

  -- jsonb because the anchor shape differs by revision_type:
  -- editor: { type: 'pm-range', from: n, to: n, paraIndex?: n }
  -- upload: { type: 'paragraph', paraIndex: n, anchor: 'Article 6' }
  anchor                 jsonb,

  author_user_id         uuid references auth.users(id) on delete set null,
  body                   text not null,
  parent_comment_id      uuid references regwatch.internal_document_comments(id) on delete cascade,

  resolved_at            timestamptz,
  resolved_by            uuid references auth.users(id) on delete set null,

  created_at             timestamptz not null default now()
);

create index internal_doc_comments_doc_idx
  on regwatch.internal_document_comments (internal_document_id, created_at);
create index internal_doc_comments_open_idx
  on regwatch.internal_document_comments (internal_document_id)
  where resolved_at is null;
create index internal_doc_comments_parent_idx
  on regwatch.internal_document_comments (parent_comment_id);

alter table regwatch.internal_document_comments enable row level security;

drop policy if exists internal_doc_comments_read on regwatch.internal_document_comments;
create policy internal_doc_comments_read on regwatch.internal_document_comments
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_comments_insert on regwatch.internal_document_comments;
create policy internal_doc_comments_insert on regwatch.internal_document_comments
  for insert to authenticated
  with check (
    regwatch.is_org_member(organization_id)
    and author_user_id = auth.uid()
  );

drop policy if exists internal_doc_comments_update on regwatch.internal_document_comments;
create policy internal_doc_comments_update on regwatch.internal_document_comments
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_member(organization_id));

grant select, insert, update on regwatch.internal_document_comments to authenticated;
grant all on regwatch.internal_document_comments to service_role;

-- ---------------------------------------------------------------------------
-- internal_document_audit_events — append-only audit log
-- ---------------------------------------------------------------------------
-- Every state transition + content change writes a row here. Auditors
-- can export the full event stream as the printable trail.
create table regwatch.internal_document_audit_events (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references regwatch.organizations(id) on delete cascade,
  internal_document_id   uuid not null references regwatch.internal_documents(id) on delete cascade,
  revision_id            uuid references regwatch.internal_document_revisions(id) on delete set null,

  event_type             regwatch.internal_document_audit_event_type not null,
  actor_user_id          uuid references auth.users(id) on delete set null,
  actor_display_snapshot text not null,

  -- Per-event payload (e.g. { fromState, toState, reasonForChange,
  -- reviewerIds, ... }). Free-form so adding event types doesn't require
  -- a schema change.
  payload                jsonb not null default '{}'::jsonb,

  occurred_at            timestamptz not null default now()
);

create index internal_doc_audit_doc_idx
  on regwatch.internal_document_audit_events (internal_document_id, occurred_at desc);
create index internal_doc_audit_event_idx
  on regwatch.internal_document_audit_events (event_type);

alter table regwatch.internal_document_audit_events enable row level security;

drop policy if exists internal_doc_audit_read on regwatch.internal_document_audit_events;
create policy internal_doc_audit_read on regwatch.internal_document_audit_events
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists internal_doc_audit_insert on regwatch.internal_document_audit_events;
create policy internal_doc_audit_insert on regwatch.internal_document_audit_events
  for insert to authenticated
  with check (regwatch.is_org_member(organization_id));

-- No update / delete — audit events are immutable.

grant select, insert on regwatch.internal_document_audit_events to authenticated;
grant all on regwatch.internal_document_audit_events to service_role;
