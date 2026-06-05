-- ===========================================================================
-- RegWatch — Extend match_regulatory_items RPC to return last_changed_at + topics
-- ---------------------------------------------------------------------------
-- The Search page renders RegulationRow which needs last_changed_at (for the
-- "Updated 3 days ago" line) and topics (for the topic chips). The original
-- RPC in 20260609 didn't return them. Postgres can't ALTER a function's
-- return signature, so we DROP + CREATE.
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
  qvec        vector(1024);
  qts         tsquery;
  fts_available boolean := false;
begin
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
      ri.last_changed_at,
      ri.jurisdiction_code,
      ri.source_url,
      ri.body_text,
      ri.topics,
      r.slug        as regulator_slug,
      r.name        as regulator_name,
      r.short_name  as regulator_short,
      case
        when qvec is not null and ri.embedding is not null
          then 1 - (ri.embedding <=> qvec)
        else 0
      end as vector_score,
      case
        when fts_available
          then ts_rank_cd(ri.body_search, qts)
        else 0
      end as fts_score
    from regwatch.regulatory_items ri
    join regwatch.regulators r on r.id = ri.regulator_id
    where
      (qvec is not null and ri.embedding is not null)
      or (fts_available and ri.body_search @@ qts)
  ),
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
    s.last_changed_at,
    s.jurisdiction_code,
    s.source_url,
    s.body_text,
    s.topics,
    s.regulator_slug,
    s.regulator_name,
    s.regulator_short,
    s.vector_score,
    s.fts_score_norm                                       as fts_score,
    alpha * s.vector_score + (1 - alpha) * s.fts_score_norm as blended_score
  from scaled s
  order by alpha * s.vector_score + (1 - alpha) * s.fts_score_norm desc
  limit match_limit;
end;
$$;

grant execute on function regwatch.match_regulatory_items(text, text, int, double precision)
  to authenticated, anon, service_role;

comment on function regwatch.match_regulatory_items(text, text, int, double precision) is
  'Hybrid FTS + vector retrieval over regulatory_items. alpha=1 = pure vector, alpha=0 = pure FTS. Returns RegulationListItem-compatible columns.';
