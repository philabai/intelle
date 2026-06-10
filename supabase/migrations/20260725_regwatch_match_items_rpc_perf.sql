-- ===========================================================================
-- RegWatch — match_regulatory_items performance rewrite (index-using lanes)
-- ---------------------------------------------------------------------------
-- Symptom: the Search page + Iris intermittently failed with
--   "Corpus query failed: canceling statement due to statement timeout"
-- and were slow (~8s) even when they succeeded.
--
-- Root cause: the previous candidate CTE filtered with
--
--     where (qvec is not null and ri.embedding is not null)
--        or (fts_available and ri.body_search @@ qts)
--
-- The OR between an embedding-presence test and the FTS match makes the
-- planner UNABLE to use the GIN index on body_search — so it sequentially
-- scans every regulatory_items row, evaluating the tsvector match per row.
-- That was fine at ~2k rows; after the IEA Policies ingest (~11.6k rows) the
-- scan crosses Postgres's 8s statement_timeout. It also dragged body_text
-- (up to 400KB/row) through the CTE for every candidate.
--
-- Fix: compute two BOUNDED, index-using lanes and union them —
--   * vector lane: ORDER BY embedding <=> qvec LIMIT k   → uses the ivfflat ANN index
--   * fts lane:    body_search @@ qts ... LIMIT k         → uses the GIN index
-- then blend the (≤2k) candidate ids and join back for the displayed columns,
-- so body_text is only materialised for the final handful of rows. Same
-- signature, same return shape, same alpha-blend semantics.
-- ===========================================================================

drop function if exists regwatch.match_regulatory_items(text, text, int, double precision);

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
  last_changed_at    timestamptz,
  jurisdiction_code  text,
  source_url         text,
  body_text          text,
  topics             text[],
  regulator_slug     text,
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
  qvec          vector(1024);
  qts           tsquery;
  fts_available boolean := false;
  -- Per-lane candidate cap: enough headroom over match_limit for the blend to
  -- reorder meaningfully, but small enough to keep the join cheap.
  lane_k        int := greatest(match_limit * 8, 48);
begin
  -- Improve ivfflat recall without a full scan (no-op when few rows embedded).
  begin
    set local ivfflat.probes = 10;
  exception when others then
    null;
  end;

  begin
    if query_embedding is null or length(query_embedding) = 0 then
      qvec := null;
    else
      qvec := query_embedding::vector(1024);
    end if;
  exception when others then
    qvec := null;
  end;

  begin
    qts := websearch_to_tsquery('english', coalesce(query_text, ''));
    fts_available := numnode(qts) > 0;
  exception when others then
    fts_available := false;
  end;

  return query
  with vec as (
    -- ANN lane — uses regulatory_items_embedding_idx (ivfflat cosine).
    select
      ri.id,
      (1 - (ri.embedding <=> qvec))::double precision as vector_score
    from regwatch.regulatory_items ri
    where qvec is not null and ri.embedding is not null
    order by ri.embedding <=> qvec
    limit lane_k
  ),
  fts as (
    -- Keyword lane — uses regulatory_items_body_search_gin (GIN).
    select
      ri.id,
      ts_rank_cd(ri.body_search, qts)::double precision as fts_score
    from regwatch.regulatory_items ri
    where fts_available and ri.body_search @@ qts
    order by ts_rank_cd(ri.body_search, qts) desc
    limit lane_k
  ),
  cand as (
    select
      u.id,
      max(u.vector_score) as vector_score,
      max(u.fts_score)    as fts_score
    from (
      select id, vector_score, 0::double precision as fts_score from vec
      union all
      select id, 0::double precision, fts_score from fts
    ) u
    group by u.id
  ),
  scaled as (
    select
      c.*,
      (case
        when max(c.fts_score) over () > 0
          then c.fts_score / max(c.fts_score) over ()
        else 0
      end)::double precision as fts_score_norm
    from cand c
  )
  select
    ri.id,
    ri.citation,
    ri.slug,
    ri.title,
    ri.summary,
    ri.instrument_type,
    ri.status,
    ri.effective_date,
    ri.last_changed_at,
    ri.jurisdiction_code,
    ri.source_url,
    ri.body_text,
    ri.topics,
    r.slug        as regulator_slug,
    r.name        as regulator_name,
    r.short_name  as regulator_short,
    s.vector_score,
    s.fts_score_norm                                                            as fts_score,
    (alpha * s.vector_score + (1 - alpha) * s.fts_score_norm)::double precision as blended_score
  from scaled s
  join regwatch.regulatory_items ri on ri.id = s.id
  join regwatch.regulators r on r.id = ri.regulator_id
  order by alpha * s.vector_score + (1 - alpha) * s.fts_score_norm desc
  limit match_limit;
end;
$$;

grant execute on function regwatch.match_regulatory_items(text, text, int, double precision)
  to authenticated, anon, service_role;

comment on function regwatch.match_regulatory_items(text, text, int, double precision) is
  'Hybrid FTS + vector retrieval over regulatory_items. v4: two bounded index-using lanes (ivfflat ANN + GIN FTS) unioned then blended, instead of an OR-filter that forced a full sequential scan. Fixes statement-timeout on large corpora. alpha=1 = pure vector, alpha=0 = pure FTS.';
