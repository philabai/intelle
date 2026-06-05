-- ===========================================================================
-- RegWatch — Service-role + authenticated grants on pending_invites
-- ---------------------------------------------------------------------------
-- Same root cause as 20260615 (the asset-management grant fix): the
-- pending_invites migration (20260608) never granted table-level access
-- explicitly. Server actions write to pending_invites via the service-role
-- client (createServiceClient) to bypass RLS, so they hit "permission
-- denied for table pending_invites" on every invite attempt.
--
-- Symptom this fixes: "permission denied for table pending_invites" when
-- an admin clicks "Add member" on /regwatch/settings/members for an
-- email that doesn't yet have an intelle.io account.
-- ===========================================================================

grant select, insert, update, delete on regwatch.pending_invites to authenticated;
grant all                              on regwatch.pending_invites to service_role;
