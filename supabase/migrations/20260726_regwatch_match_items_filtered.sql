-- ===========================================================================
-- RegWatch — match_regulatory_items: multi-select source/facet filters
-- ---------------------------------------------------------------------------
-- Re-introduces filtering on the hybrid retriever WITHOUT the seq-scan timeout
-- that the 20260725 perf rewrite fixed. Lesson from that rewrite: filtering the
-- ANN scan (where embedding <=> qvec ... + WHERE instrument_type = ...) makes
-- the planner abandon the ivfflat index and sequentially scan ~11.6k rows.
--
-- So we DON'T filter inside the index lanes. Instead:
--   1. Both lanes run UNFILTERED + index-bounded (ivfflat ANN, GIN FTS), but
--      over-fetch more candidates when filters are present.
--   2. A `filtered` CTE applies the filters to the merged id-level candidate set
--      (≤2·lane_k rows, no body_text) — a cheap join, no full scan.
--   3. body_text is still materialised only for the final ≤match_limit rows.
--
-- All facet args are arrays (multi-select). null = "no filter on this facet";
-- an empty array '{}' matches nothing (caller deselected every source).
--
-- Self-contained: drops every prior signature so applying just this migration
-- yields the canonical function regardless of which earlier ones were applied.
-- ===========================================================================

drop function if exists regwatch.match_regulatory_items(text, text, int, double precision);
drop function if exists regwatch.match_regulatory_items(text, text, int, double precision, text[], text, text, text);
drop function if exists regwatch.match_regulatory_items(text, text, int, double precision, text[], text[], text[], text[]);

create or replace function regwatch.match_regulatory_items(
  query_embedding         text,
  query_text              text,
  match_limit             int default 6,
  alpha                   double precision default 0.65,
  filter_instrument_types text[] default null,
  filter_regulators       text[] default null,
  filter_topics           text[] default null,
  filter_statuses         text[] default null
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
  has_filter    boolean := (filter_instrument_types is not null
                            or filter_regulators is not null
                            or filter_topics is not null
                            or filter_statuses is not null);
  -- Over-fetch more candidates when filtering so enough survive the post-filter.
  lane_k        int := case when has_filter
                            then greatest(match_limit * 16, 200)
                            else greatest(match_limit * 8, 48) end;
begin
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
    -- ANN lane — UNFILTERED so the ivfflat index drives the scan.
    select
      ri.id,
      (1 - (ri.embedding <=> qvec))::double precision as vector_score
    from regwatch.regulatory_items ri
    where qvec is not null and ri.embedding is not null
    order by ri.embedding <=> qvec
    limit lane_k
  ),
  fts as (
    -- Keyword lane — UNFILTERED so the GIN index drives the scan.
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
      select vec.id, vec.vector_score, 0::double precision as fts_score from vec
      union all
      select fts.id, 0::double precision, fts.fts_score from fts
    ) u
    group by u.id
  ),
  filtered as (
    -- Apply facet filters to the bounded id-level candidate set. Joins the base
    -- columns (NOT body_text) for ≤2·lane_k rows — cheap, no full scan.
    select c.id, c.vector_score, c.fts_score
    from cand c
    join regwatch.regulatory_items ri on ri.id = c.id
    join regwatch.regulators r on r.id = ri.regulator_id
    where
      (filter_instrument_types is null or ri.instrument_type = any(filter_instrument_types))
      and (filter_regulators is null or r.slug = any(filter_regulators))
      and (filter_topics is null or ri.topics && filter_topics)
      and (filter_statuses is null or ri.status = any(filter_statuses))
  ),
  scaled as (
    select
      f.*,
      (case
        when max(f.fts_score) over () > 0
          then f.fts_score / max(f.fts_score) over ()
        else 0
      end)::double precision as fts_score_norm
    from filtered f
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

grant execute on function regwatch.match_regulatory_items(text, text, int, double precision, text[], text[], text[], text[])
  to authenticated, anon, service_role;

comment on function regwatch.match_regulatory_items(text, text, int, double precision, text[], text[], text[], text[]) is
  'Hybrid FTS + vector retrieval with multi-select facet filters. v5: two unfiltered index-using lanes (ivfflat ANN + GIN FTS) over-fetch, filters apply to the merged id-level candidate set (no seq scan), body_text materialised only for the final rows. Facets are text[] allow-lists; null = no filter.';
