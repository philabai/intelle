-- ===========================================================================
-- RegWatch — Hybrid retrieval RPC: match_regulatory_items
-- ---------------------------------------------------------------------------
-- Iris (and the Search surface) need to rank corpus items by a blend of:
--   - vector similarity (1 - cosine distance) against a query embedding,
--   - FTS rank against the body_search tsvector.
--
-- supabase-js can't issue raw SQL ORDER BY on a pgvector distance through
-- PostgREST without an RPC, so we ship one. Inputs:
--   - query_embedding text  → cast to vector(1024) on entry
--   - query_text      text  → plain English websearch query
--   - match_limit     int   → default 6
--   - alpha           float → weight on vector score (0..1); 1-alpha goes
--                              to FTS rank. Default 0.65 — vector dominates
--                              but FTS still matters for exact-citation
--                              ("Article 6") queries.
-- Output rows mirror the columns the Iris route needs.
-- ===========================================================================

create or replace function regwatch.match_regulatory_items(
  query_embedding text,
  query_text      text,
  match_limit     int default 6,
  alpha           double precision default 0.65
)
returns table (
  id                 uuid,
  citation           text,
  slug               text,
  title              text,
  summary            text,
  instrument_type    text,
  status             text,
  effective_date     date,
  jurisdiction_code  text,
  source_url         text,
  body_text          text,
  regulator_name     text,
  regulator_short    text,
  vector_score       double precision,
  fts_score          double precision,
  blended_score      double precision
)
language plpgsql
stable
security definer
set search_path = regwatch, public
as $$
declare
  qvec        vector(1024);
  qts         tsquery;
  fts_available boolean := false;
begin
  -- Parse the inputs defensively. A NULL/empty embedding falls back to
  -- pure FTS so the function still works during the Voyage backfill phase.
  begin
    if query_embedding is null or length(query_embedding) = 0 then
      qvec := null;
    else
      qvec := query_embedding::vector(1024);
    end if;
  exception when others then
    qvec := null;
  end;

  -- websearch_to_tsquery returns empty on stopword-only input; guard so the
  -- whole call doesn't degrade to "no rows".
  begin
    qts := websearch_to_tsquery('english', coalesce(query_text, ''));
    fts_available := numnode(qts) > 0;
  exception when others then
    fts_available := false;
  end;

  return query
  with candidates as (
    select
      ri.id,
      ri.citation,
      ri.slug,
      ri.title,
      ri.summary,
      ri.instrument_type,
      ri.status,
      ri.effective_date,
      ri.jurisdiction_code,
      ri.source_url,
      ri.body_text,
      r.name        as regulator_name,
      r.short_name  as regulator_short,
      case
        when qvec is not null and ri.embedding is not null
          then 1 - (ri.embedding <=> qvec)        -- cosine similarity in [0,1]
        else 0
      end as vector_score,
      case
        when fts_available
          then ts_rank_cd(ri.body_search, qts)
        else 0
      end as fts_score
    from regwatch.regulatory_items ri
    join regwatch.regulators r on r.id = ri.regulator_id
    -- Only consider items that COULD plausibly match: either embedded and
    -- vector-similar, or FTS-matched. Avoids scanning the whole corpus when
    -- both lanes are dead.
    where
      (qvec is not null and ri.embedding is not null)
      or (fts_available and ri.body_search @@ qts)
  ),
  -- Normalise FTS rank to [0,1] across the candidate set so the alpha blend
  -- is meaningful (vector cosine is already in [0,1]). max() across the
  -- candidate set is the simplest stable scaler.
  scaled as (
    select
      c.*,
      case
        when max(c.fts_score) over () > 0
          then c.fts_score / max(c.fts_score) over ()
        else 0
      end as fts_score_norm
    from candidates c
  )
  select
    s.id,
    s.citation,
    s.slug,
    s.title,
    s.summary,
    s.instrument_type,
    s.status,
    s.effective_date,
    s.jurisdiction_code,
    s.source_url,
    s.body_text,
    s.regulator_name,
    s.regulator_short,
    s.vector_score,
    s.fts_score_norm                                   as fts_score,
    alpha * s.vector_score + (1 - alpha) * s.fts_score_norm as blended_score
  from scaled s
  order by alpha * s.vector_score + (1 - alpha) * s.fts_score_norm desc
  limit match_limit;
end;
$$;

grant execute on function regwatch.match_regulatory_items(text, text, int, double precision)
  to authenticated, anon, service_role;

comment on function regwatch.match_regulatory_items(text, text, int, double precision) is
  'Hybrid FTS + vector retrieval over regulatory_items. alpha=1 = pure vector, alpha=0 = pure FTS.';
