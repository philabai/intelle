-- ===========================================================================
-- Vantage — Translation background-job status tracking
-- ---------------------------------------------------------------------------
-- The synchronous server-action translation pattern was hitting Vercel
-- function timeouts and leaving the UI stuck on "Translating…" with no
-- progress. New pattern: an API route kicks off the work via next/after
-- so it survives client disconnect, and the client polls a status endpoint
-- every 2s. These columns track that lifecycle.
--
--   translation_status:
--     null / 'not_started' — never attempted
--     'in_progress'        — work is running server-side
--     'completed'          — translated_text is populated and fresh
--     'failed'             — last attempt errored; translation_error has details
--
--   translation_started_at: stamps when 'in_progress' began so the route
--     can detect stale-in-progress (>5 min) and retry.
--   translation_error: latest failure message for UI surfacing.
-- ===========================================================================

alter table regwatch.regulatory_items
  add column if not exists translation_status text,
  add column if not exists translation_started_at timestamptz,
  add column if not exists translation_error text;

-- Backfill: any row that already has translated_text counts as completed.
update regwatch.regulatory_items
   set translation_status = 'completed'
 where translated_text is not null
   and translation_status is null;
