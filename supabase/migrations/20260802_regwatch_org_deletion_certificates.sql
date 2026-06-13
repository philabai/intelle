-- ===========================================================================
-- RegWatch — org_deletion_certificates: tamper-evident proof of customer purge
-- ---------------------------------------------------------------------------
-- When a customer offboards, deleteOrganizationCascade() purges all of their
-- data — Storage objects + the DB cascade (internal documents, revisions,
-- embeddings, evidence, obligations, …) — and writes one row here recording
-- what was deleted and that residual checks came back at zero.
--
-- This table deliberately has NO foreign key to organizations: the org row is
-- gone by the time the certificate is written, and the certificate must survive
-- the cascade as durable proof of deletion. Service-role only (RLS denies all
-- authenticated access — these outlive the org and its members).
--
-- NOTE: because intelleLLM is a customer-AGNOSTIC model used via RAG (we never
-- fine-tune on customer data), there are NO model weights to scrub — purge is a
-- pure store operation (Storage + DB). The self-hosted inference/embed/ASR
-- servers must be configured with no request logging so there's no on-box copy.
-- ===========================================================================

create table if not exists regwatch.org_deletion_certificates (
  id                      uuid primary key default gen_random_uuid(),
  organization_id         uuid not null,        -- snapshot, NOT a FK (org is gone)
  organization_name       text,
  requested_by            text,
  storage_objects_deleted int not null default 0,
  db_cascade_ok           boolean not null default false,
  residual_report         jsonb not null default '{}'::jsonb,  -- per-table remaining counts (all 0)
  certificate             jsonb not null default '{}'::jsonb,  -- signed summary
  started_at              timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz not null default now()
);

create index if not exists odc_org_idx
  on regwatch.org_deletion_certificates (organization_id);

alter table regwatch.org_deletion_certificates enable row level security;
-- No policy for `authenticated` → RLS denies. Only the service role (which
-- bypasses RLS) reads/writes these.
