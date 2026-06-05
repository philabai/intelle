-- ===========================================================================
-- RegWatch — Service-role grants on the Phase 1 Asset Management tables
-- ---------------------------------------------------------------------------
-- The initial regwatch migration granted `service_role` ALL on every table
-- that existed at that time, but those grants don't cascade to tables
-- created in later migrations. Phase 1 added five new tables; this catches
-- the service-role client up so server actions (which write via the
-- service-role client to bypass RLS) actually have privileges.
--
-- Symptom this fixes: "permission denied for table assets" when an admin
-- clicks "+ Add Site" on /regwatch/assets/setup.
-- ===========================================================================

grant all on regwatch.assets                                  to service_role;
grant all on regwatch.asset_hierarchy_config                  to service_role;
grant all on regwatch.compliance_obligations                  to service_role;
grant all on regwatch.internal_documents                      to service_role;
grant all on regwatch.internal_document_regulation_links      to service_role;

-- Also grant execute on the new is_org_admin helper to service_role so the
-- admin-lock trigger (security definer, but called from service-role-
-- initiated updates) can resolve cleanly.
grant execute on function regwatch.is_org_admin(uuid) to service_role;
