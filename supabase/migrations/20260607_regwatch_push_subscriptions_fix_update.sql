-- ============================================================================
-- RegWatch — push_subscriptions: add missing UPDATE grant + RLS policy
--
-- Phase 1.7 shipped with grants for SELECT/INSERT/DELETE only. The browser
-- subscribe flow uses upsert (ON CONFLICT DO UPDATE) so re-subscribing the
-- same browser is idempotent. Postgres requires UPDATE permission on the
-- table for the ON CONFLICT DO UPDATE clause even when no conflict actually
-- fires — without it the action returns
--   "permission denied for table push_subscriptions"
--
-- This migration adds the missing grant plus the matching self-only RLS
-- policy so users can only update their own subscription rows. Idempotent.
-- ============================================================================

-- Table-level GRANT (PostgREST applies these before RLS).
grant update on regwatch.push_subscriptions to authenticated;

-- RLS policy — self-only updates.
drop policy if exists push_subs_self_update on regwatch.push_subscriptions;
create policy push_subs_self_update
  on regwatch.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and regwatch.is_org_member(organization_id));

-- ===========================================================================
-- End of 20260607_regwatch_push_subscriptions_fix_update.sql
-- ===========================================================================
