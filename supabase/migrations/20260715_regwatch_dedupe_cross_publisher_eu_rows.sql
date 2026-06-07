-- ===========================================================================
-- Vantage — Dedupe EU regulations duplicated across publisher variants
-- ---------------------------------------------------------------------------
-- The eur-lex connector ships as multiple topic-filtered variants
-- (eurlex-dg-clima, eurlex-dg-ener). The same CELEX regulation often
-- surfaces under both topic filters and gets inserted twice — once per
-- publisher. The (regulator_id, citation) unique constraint allowed it
-- because the regulator_ids differ.
--
-- After 20260714 rewrote slugs into the eu-{type}-YYYY-N form, those
-- twin rows share the same slug, so the detail page's .maybeSingle()
-- query errors with "Cannot coerce the result to a single JSON object"
-- and the user sees a 404.
--
-- This migration:
--   1. Identifies (jurisdiction_code, slug) pairs that have >1 row.
--   2. Keeps the row with the most recent last_changed_at (or the
--      lowest id if tied — fully deterministic).
--   3. Deletes the other(s).
--
-- Run-once; idempotent because the dedupe is a no-op when no
-- duplicates remain.
-- ===========================================================================

with ranked as (
  select id,
         row_number() over (
           partition by jurisdiction_code, slug
           order by last_changed_at desc, id asc
         ) as rn
    from regwatch.regulatory_items
)
delete from regwatch.regulatory_items ri
 using ranked
 where ri.id = ranked.id
   and ranked.rn > 1;

-- Sanity print: any (jurisdiction_code, slug) pairs still duplicated?
do $$
declare
  remaining int;
begin
  select count(*) into remaining
    from (
      select jurisdiction_code, slug, count(*) as n
        from regwatch.regulatory_items
       group by jurisdiction_code, slug
      having count(*) > 1
    ) dupes;
  raise notice 'Remaining (jurisdiction, slug) duplicate groups: %', remaining;
end $$;
