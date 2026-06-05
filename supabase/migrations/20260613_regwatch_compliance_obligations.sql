-- ===========================================================================
-- RegWatch — compliance_obligations (Phase 1 of Asset Management)
-- ---------------------------------------------------------------------------
-- The workflow primitive that ties an asset to a regulation (or specific
-- clause within one), with an assigned reviewer, a state machine, and
-- admin-locked grading.
--
-- Locked columns (severity, compliance_status, admin_signed_off_at,
-- compliance_attested_until) are enforced by a BEFORE UPDATE trigger that
-- raises if the caller isn't an org admin. The server actions provide
-- the friendly error; this trigger is the floor of correctness so a hand-
-- crafted PATCH from the network tab can't bypass the gate.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type regwatch.obligation_severity as enum (
  'negligible', 'marginal', 'moderate', 'critical', 'catastrophic'
);

create type regwatch.obligation_compliance_status as enum (
  'unknown', 'non-compliant', 'at-risk', 'compliant'
);

create type regwatch.obligation_review_status as enum (
  'open',
  'awaiting-triage',
  'in-review',
  'pending-approval',
  'verified',
  'closed',
  'not-applicable'
);

create type regwatch.obligation_review_cadence as enum (
  'none', 'quarterly', 'semi-annually', 'annually', 'custom'
);

-- ---------------------------------------------------------------------------
-- compliance_obligations
-- ---------------------------------------------------------------------------
create table regwatch.compliance_obligations (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references regwatch.organizations(id) on delete cascade,

  -- Attachment: required asset, optional regulation (nullable for clause-
  -- only obligations created from internal-only requirements), optional
  -- clause text/anchor for pinning a specific section of a long regulation.
  asset_id                 uuid not null references regwatch.assets(id) on delete cascade,
  regulatory_item_id       uuid references regwatch.regulatory_items(id) on delete set null,
  clause_text              text,
  clause_anchor            text,

  -- Admin-locked grading (enforced by trigger below)
  severity                 regwatch.obligation_severity not null default 'moderate',
  compliance_status        regwatch.obligation_compliance_status not null default 'unknown',

  -- Workflow
  assigned_reviewer_user_id uuid references auth.users(id) on delete set null,
  review_status            regwatch.obligation_review_status not null default 'open',
  review_due_at            timestamptz,
  review_completed_at      timestamptz,
  -- Structured review payload: applicability, rationale, evidence_path,
  -- redlines, etc. Free-form so reviewers can capture what they need.
  review_notes             jsonb not null default '{}'::jsonb,
  -- Storage path of the mandatory evidence file uploaded at review
  -- completion (private regwatch-documents bucket).
  evidence_file_path       text,

  -- Re-review cadence — admin sets at sign-off; cron auto-creates next task.
  review_cadence           regwatch.obligation_review_cadence not null default 'none',
  review_cadence_custom_days int,
  compliance_attested_until timestamptz,

  -- Admin sign-off (21 CFR Part 11 style: identity + reason + timestamp)
  admin_signed_off_at      timestamptz,
  admin_signed_off_by      uuid references auth.users(id) on delete set null,
  signoff_rationale        text,

  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- One obligation per (org, asset, regulation, clause) tuple. Clause
  -- anchors that are NULL participate in the uniqueness check so a single
  -- "whole regulation" obligation can't be created twice.
  unique (organization_id, asset_id, regulatory_item_id, clause_anchor)
);

create index obligations_org_status_idx
  on regwatch.compliance_obligations (organization_id, review_status);
create index obligations_reviewer_open_idx
  on regwatch.compliance_obligations (assigned_reviewer_user_id)
  where review_status in ('awaiting-triage', 'in-review');
create index obligations_reg_item_idx
  on regwatch.compliance_obligations (regulatory_item_id)
  where regulatory_item_id is not null;
create index obligations_asset_idx
  on regwatch.compliance_obligations (asset_id);
create index obligations_attested_until_idx
  on regwatch.compliance_obligations (compliance_attested_until)
  where compliance_attested_until is not null;

create trigger compliance_obligations_set_updated_at
  before update on regwatch.compliance_obligations
  for each row execute function regwatch.set_updated_at();

-- ---------------------------------------------------------------------------
-- Admin-lock trigger
-- ---------------------------------------------------------------------------
-- The trigger raises if a non-admin attempts to change any of:
--   severity, compliance_status, admin_signed_off_at, admin_signed_off_by,
--   signoff_rationale, compliance_attested_until, review_cadence,
--   review_cadence_custom_days.
-- Reviewers may freely change review_status (via permitted state
-- transitions enforced server-side), review_completed_at, review_notes,
-- evidence_file_path, and assigned_reviewer_user_id (re-self-assignment
-- for example).
-- ---------------------------------------------------------------------------
create or replace function regwatch.enforce_obligation_admin_locks()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
begin
  if (
       old.severity                 is distinct from new.severity
    or old.compliance_status        is distinct from new.compliance_status
    or old.admin_signed_off_at      is distinct from new.admin_signed_off_at
    or old.admin_signed_off_by      is distinct from new.admin_signed_off_by
    or old.signoff_rationale        is distinct from new.signoff_rationale
    or old.compliance_attested_until is distinct from new.compliance_attested_until
    or old.review_cadence           is distinct from new.review_cadence
    or old.review_cadence_custom_days is distinct from new.review_cadence_custom_days
  ) and not regwatch.is_org_admin(new.organization_id) then
    raise exception
      'Only org admins can modify severity, compliance_status, sign-off, or review cadence (regwatch.obligation_admin_locks)';
  end if;
  return new;
end;
$$;

create trigger obligation_admin_locks
  before update on regwatch.compliance_obligations
  for each row execute function regwatch.enforce_obligation_admin_locks();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table regwatch.compliance_obligations enable row level security;

drop policy if exists obligations_member_read on regwatch.compliance_obligations;
create policy obligations_member_read on regwatch.compliance_obligations
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

-- Insert: admins create; the reviewer assignment + state changes flow
-- through UPDATE, gated by the trigger above.
drop policy if exists obligations_admin_insert on regwatch.compliance_obligations;
create policy obligations_admin_insert on regwatch.compliance_obligations
  for insert to authenticated
  with check (regwatch.is_org_admin(organization_id));

-- Update: any org member can update the row; the trigger above raises if
-- they try to change a locked column without admin role. Server actions
-- also strip locked fields before sending; the trigger is the safety net.
drop policy if exists obligations_member_update on regwatch.compliance_obligations;
create policy obligations_member_update on regwatch.compliance_obligations
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_member(organization_id));

drop policy if exists obligations_admin_delete on regwatch.compliance_obligations;
create policy obligations_admin_delete on regwatch.compliance_obligations
  for delete to authenticated
  using (regwatch.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on regwatch.compliance_obligations to authenticated;
grant insert, update, delete on regwatch.compliance_obligations to authenticated;
