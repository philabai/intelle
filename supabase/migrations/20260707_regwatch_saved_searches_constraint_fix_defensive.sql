-- ===========================================================================
-- Vantage — Defensive saved_searches constraint fix (replaces 20260706)
-- ---------------------------------------------------------------------------
-- 20260706 assumed a clean table. If you had any rows + an existing
-- functional index, adding the plain unique constraint can fail with
-- "Key (user_id, query)=(...) is duplicated" (whitespace variants) or
-- with index-name mismatches.
--
-- This version:
--   1. Trims whitespace on every existing query value.
--   2. Drops duplicate rows, keeping the OLDEST per (user_id, query)
--      because the older save is the one users explicitly created.
--   3. Drops any pre-existing unique constraint / index on these
--      columns regardless of its name.
--   4. Adds the plain unique constraint.
--   5. Re-runs idempotent — safe to apply multiple times.
-- ===========================================================================

-- 1. Normalise existing queries (trim leading/trailing whitespace).
update regwatch.saved_searches
   set query = btrim(query)
 where query <> btrim(query);

-- 2. Dedupe: keep the earliest row per (user_id, query).
delete from regwatch.saved_searches a
 using regwatch.saved_searches b
 where a.user_id = b.user_id
   and a.query   = b.query
   and a.created_at > b.created_at;

-- 3. Drop any existing constraint / index on these columns regardless
--    of the name PostgreSQL or a prior migration assigned.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class cls    on cls.oid = con.conrelid
      join pg_namespace ns on ns.oid  = cls.relnamespace
     where ns.nspname = 'regwatch'
       and cls.relname = 'saved_searches'
       and con.contype = 'u'
  loop
    execute format(
      'alter table regwatch.saved_searches drop constraint %I',
      c.conname
    );
  end loop;

  for c in
    select idx.indexrelname as iname
      from pg_stat_user_indexes idx
     where idx.schemaname = 'regwatch'
       and idx.relname    = 'saved_searches'
       and idx.indexrelname like 'saved_searches_user_query%'
  loop
    execute format('drop index if exists regwatch.%I', c.iname);
  end loop;
end $$;

-- 4. Add the plain unique constraint PostgREST onConflict can match.
alter table regwatch.saved_searches
  add constraint saved_searches_user_query_key unique (user_id, query);
