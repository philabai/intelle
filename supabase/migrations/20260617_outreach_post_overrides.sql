-- ============================================================================
-- Vantage Outreach — per-article quality overrides
-- Lets an editor tune the rubric/prompt/threshold for ONE article without
-- changing the global generation config. The override is merged over the
-- global config when that article is (re)generated.
-- ============================================================================

alter table outreach.posts
  add column if not exists generation_overrides jsonb;
