-- ===========================================================================
-- Vantage — Fix saved_searches ON CONFLICT compatibility
-- ---------------------------------------------------------------------------
-- The original 20260704 migration created a functional unique index
-- on (user_id, lower(query)). PostgREST's upsert (`onConflict`) needs
-- a plain unique CONSTRAINT (or plain index without expressions), so
-- saveSearch failed with "no unique or exclusion constraint matching
-- the ON CONFLICT specification".
--
-- Fix: drop the functional index, replace with a plain unique
-- constraint on (user_id, query). Case-sensitive — fine in practice
-- because the SearchInput normalises whitespace before submitting.
-- ===========================================================================

drop index if exists regwatch.saved_searches_user_query_uq;

-- Use a CONSTRAINT (not just an index) so PostgREST onConflict can
-- reference it by column list.
alter table regwatch.saved_searches
  drop constraint if exists saved_searches_user_query_key;
alter table regwatch.saved_searches
  add constraint saved_searches_user_query_key unique (user_id, query);
