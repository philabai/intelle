-- F10 — soft-delete + grace window for organization deletion.
-- The purge endpoint previously cascaded immediately (Storage + DB). Add a
-- scheduled-deletion window so an accidental/malicious trigger is recoverable:
-- a request marks the org, and a daily cron purges only orgs whose grace window
-- has elapsed. APPLY in the Supabase SQL editor.

alter table regwatch.organizations
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_requested_by  text;

create index if not exists organizations_deletion_requested_idx
  on regwatch.organizations (deletion_requested_at)
  where deletion_requested_at is not null;
