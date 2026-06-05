-- ===========================================================================
-- RegWatch — AI Evidence Analysis (Phase A: schema + document analysis)
-- ---------------------------------------------------------------------------
-- Adds a junction table linking compliance_obligations to one-or-more uploaded
-- evidence files. Each file carries its own AI analysis lifecycle so a
-- reviewer can drop a PDF + 3 photos + a video and get per-file findings
-- back. The existing compliance_obligations.evidence_file_path column stays
-- as a denormalised "primary file" pointer for the existing summary cards.
--
-- Notifications: extends obligation_notification_kind with
-- evidence_analysis_completed + evidence_analysis_flagged_discrepancy.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type regwatch.evidence_file_kind as enum (
  'document',  -- PDF / DOCX / TXT
  'image',     -- JPG / PNG / HEIC / WEBP
  'video'      -- MP4 / MOV (Enterprise-tier analysis only)
);

create type regwatch.evidence_analysis_status as enum (
  'pending',     -- queued for the analyse-evidence cron
  'processing',  -- cron picked it up, hasn't returned
  'completed',   -- success
  'failed',      -- error during analysis (see analysis_error)
  'skipped'      -- video uploaded by non-Enterprise org
);

create type regwatch.evidence_analysis_signal as enum (
  'looks-compliant',
  'concerns',
  'non-compliant',
  'inconclusive'
);

-- Severity for individual findings — separate from the obligation-level
-- severity enum because finding granularity is finer (we care about "low
-- severity" findings inside an otherwise high-severity obligation).
create type regwatch.evidence_finding_severity as enum (
  'info',
  'low',
  'medium',
  'high',
  'critical'
);

-- ---------------------------------------------------------------------------
-- obligation_evidence_files
-- ---------------------------------------------------------------------------
create table regwatch.obligation_evidence_files (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references regwatch.organizations(id) on delete cascade,
  obligation_id       uuid not null references regwatch.compliance_obligations(id) on delete cascade,

  -- File metadata
  file_path           text not null,
  file_name           text not null,
  file_size           bigint,
  mime_type           text,
  file_kind           regwatch.evidence_file_kind not null,

  uploaded_by         uuid references auth.users(id) on delete set null,
  uploaded_at         timestamptz not null default now(),

  -- Analysis fields
  analysis_status     regwatch.evidence_analysis_status not null default 'pending',
  analysis_started_at timestamptz,
  analysis_completed_at timestamptz,
  analysis_model      text,              -- e.g. claude-sonnet-4-6 / claude-sonnet-4-6+whisper-1
  analysis_summary    text,              -- one-paragraph natural-language summary
  analysis_findings   jsonb not null default '[]'::jsonb,
  analysis_overall_signal regwatch.evidence_analysis_signal,
  analysis_confidence numeric(3,2) check (analysis_confidence between 0 and 1),
  analysis_token_usage jsonb not null default '{}'::jsonb,  -- {input, output, cache_read, cache_write}
  analysis_error      text,
  analysis_attempt_count int not null default 0,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index obligation_evidence_obligation_idx
  on regwatch.obligation_evidence_files (obligation_id, uploaded_at desc);
create index obligation_evidence_org_idx
  on regwatch.obligation_evidence_files (organization_id);
create index obligation_evidence_pending_idx
  on regwatch.obligation_evidence_files (analysis_status, uploaded_at)
  where analysis_status in ('pending', 'processing');

create trigger obligation_evidence_files_set_updated_at
  before update on regwatch.obligation_evidence_files
  for each row execute function regwatch.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table regwatch.obligation_evidence_files enable row level security;

drop policy if exists obligation_evidence_member_read on regwatch.obligation_evidence_files;
create policy obligation_evidence_member_read on regwatch.obligation_evidence_files
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

-- Any org member can insert (server actions add the role check on top —
-- typically only the assigned reviewer or admins upload). Keeping RLS loose
-- so service-role + admin re-runs work.
drop policy if exists obligation_evidence_member_insert on regwatch.obligation_evidence_files;
create policy obligation_evidence_member_insert on regwatch.obligation_evidence_files
  for insert to authenticated
  with check (regwatch.is_org_member(organization_id));

drop policy if exists obligation_evidence_member_update on regwatch.obligation_evidence_files;
create policy obligation_evidence_member_update on regwatch.obligation_evidence_files
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_member(organization_id));

-- Only admins delete (preserves audit trail).
drop policy if exists obligation_evidence_admin_delete on regwatch.obligation_evidence_files;
create policy obligation_evidence_admin_delete on regwatch.obligation_evidence_files
  for delete to authenticated
  using (regwatch.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Grants — explicit per the new-table-grant rule
-- ---------------------------------------------------------------------------
grant select, insert, update on regwatch.obligation_evidence_files to authenticated;
grant delete on regwatch.obligation_evidence_files to authenticated;
grant all on regwatch.obligation_evidence_files to service_role;

-- ---------------------------------------------------------------------------
-- Extend obligation_notification_kind enum
-- ---------------------------------------------------------------------------
alter type regwatch.obligation_notification_kind
  add value if not exists 'evidence_analysis_completed';
alter type regwatch.obligation_notification_kind
  add value if not exists 'evidence_analysis_flagged_discrepancy';
