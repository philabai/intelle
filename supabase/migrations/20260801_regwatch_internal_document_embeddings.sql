-- ===========================================================================
-- RegWatch — internal_document_embeddings + search_internal_documents_hybrid
-- ---------------------------------------------------------------------------
-- Self-hosted, privacy-isolated semantic search over CUSTOMER documents. These
-- embeddings are produced by the self-hosted intelleLLM embedder (NOT Voyage,
-- which is a third party) and are STRICTLY separate from the public-regulation
-- embeddings on regulatory_items. They only exist when intelleLLM isolation is
-- enabled; until then company-doc search stays FTS-only and this table is empty.
--
-- DIMENSION: vector(1024) matches the default INTELLE_EMBED_DIM=1024. If you
-- choose an embedder with a different dimension, change it HERE and in
-- INTELLE_EMBED_DIM before backfilling — the dim is baked into the column.
--
-- PURGE: every FK is ON DELETE CASCADE, so deleting an organization removes all
-- of its document embeddings automatically (organizations → internal_documents
-- → internal_document_revisions → internal_document_embeddings).
-- ===========================================================================

create table if not exists regwatch.internal_document_embeddings (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null
                          references regwatch.organizations(id) on delete cascade,
  internal_document_id  uuid not null
                          references regwatch.internal_documents(id) on delete cascade,
  revision_id           uuid not null
                          references regwatch.internal_document_revisions(id) on delete cascade,
  chunk_index           int  not null default 0,
  chunk_text            text not null,
  embedding             vector(1024),
  created_at            timestamptz not null default now(),
  unique (revision_id, chunk_index)
);

create index if not exists ide_doc_idx
  on regwatch.internal_document_embeddings (internal_document_id);
create index if not exists ide_org_idx
  on regwatch.internal_document_embeddings (organization_id);
create index if not exists ide_revision_idx
  on regwatch.internal_document_embeddings (revision_id);
-- ANN index. Per-org corpora are small; ivfflat with a modest list count is
-- plenty (rebuild/ANALYZE once rows exist). Switch to HNSW if corpora grow.
create index if not exists ide_ann_idx
  on regwatch.internal_document_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table regwatch.internal_document_embeddings enable row level security;

-- Members may READ their org's embeddings (so SECURITY INVOKER search works).
-- Writes are service-role only (the embedding pipeline) — no authenticated
-- insert/update/delete policy is defined, so RLS denies those by default.
drop policy if exists ide_member_read on regwatch.internal_document_embeddings;
create policy ide_member_read on regwatch.internal_document_embeddings
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Hybrid retrieval RPC — blends the FTS lane (mirrors search_internal_documents)
-- with a vector lane over internal_document_embeddings. SECURITY INVOKER (the
-- default) so the internal_documents + embeddings RLS scope results to the
-- caller's org. Falls back to FTS-only when the query embedding is null (covers
-- the backfill window and isolation-off).
-- ---------------------------------------------------------------------------

drop function if exists regwatch.search_internal_documents_hybrid(text, text, int, double precision, uuid[], boolean);

create or replace function regwatch.search_internal_documents_hybrid(
  query_embedding text,
  query_text      text,
  match_limit     int default 6,
  alpha           double precision default 0.6,
  folder_ids      uuid[] default null,
  include_unfiled boolean default false
)
returns table (
  id             uuid,
  title          text,
  doc_kind       text,
  internal_code  text,
  version        text,
  status         text,
  folder_id      uuid,
  updated_at     timestamptz,
  snippet        text,
  vector_score   double precision,
  fts_score      double precision,
  blended_score  double precision
)
language plpgsql
stable
set search_path = regwatch, public
as $$
declare
  qvec          vector(1024);
  qts           tsquery;
  fts_available boolean := false;
begin
  -- Parse the query embedding; null/empty → FTS-only lane.
  begin
    if query_embedding is null or length(query_embedding) = 0 then
      qvec := null;
    else
      qvec := query_embedding::vector(1024);
    end if;
  exception when others then
    qvec := null;
  end;

  -- Parse the FTS query; stopword-only → not available.
  begin
    qts := websearch_to_tsquery('english', coalesce(query_text, ''));
    fts_available := numnode(qts) > 0;
  exception when others then
    fts_available := false;
  end;

  if qvec is null and not fts_available then
    return;  -- nothing to match on
  end if;

  return query
  with base as (
    select
      d.id,
      d.title,
      d.doc_kind::text  as doc_kind,
      d.internal_code,
      d.version,
      d.status::text    as status,
      d.folder_id,
      d.updated_at,
      d.current_revision_id as rev_id,
      r.body_text,
      to_tsvector(
        'english',
        coalesce(d.title, '') || ' ' ||
        coalesce(d.internal_code, '') || ' ' ||
        coalesce(d.description, '') || ' ' ||
        coalesce(r.body_text, '')
      ) as tsv
    from regwatch.internal_documents d
    left join regwatch.internal_document_revisions r
      on r.id = d.current_revision_id
    where
      d.status <> 'retired'
      and (
        ((folder_ids is null or cardinality(folder_ids) = 0) and not include_unfiled)
        or (folder_ids is not null and d.folder_id = any(folder_ids))
        or (include_unfiled and d.folder_id is null)
      )
  ),
  vec as (
    select b.id, max(1 - (e.embedding <=> qvec)) as vector_score
    from base b
    join regwatch.internal_document_embeddings e
      on e.internal_document_id = b.id
     and e.revision_id = b.rev_id
    where qvec is not null and e.embedding is not null
    group by b.id
  ),
  candidates as (
    select
      b.*,
      coalesce(v.vector_score, 0)                                   as vector_score,
      case when fts_available then ts_rank_cd(b.tsv, qts) else 0 end as fts_score
    from base b
    left join vec v on v.id = b.id
    where
      (qvec is not null and v.id is not null)
      or (fts_available and b.tsv @@ qts)
  ),
  scaled as (
    select
      c.*,
      case
        when max(c.fts_score) over () > 0
          then c.fts_score / max(c.fts_score) over ()
        else 0
      end as fts_norm
    from candidates c
  )
  select
    s.id,
    s.title,
    s.doc_kind,
    s.internal_code,
    s.version,
    s.status,
    s.folder_id,
    s.updated_at,
    case
      when fts_available then
        ts_headline(
          'english',
          coalesce(s.body_text, s.title),
          qts,
          'StartSel=⟦,StopSel=⟧,MaxFragments=2,MaxWords=20,MinWords=6,ShortWord=2,FragmentDelimiter= … '
        )
      else left(coalesce(s.body_text, s.title), 240)
    end as snippet,
    s.vector_score,
    s.fts_norm                                                  as fts_score,
    (alpha * s.vector_score + (1 - alpha) * s.fts_norm)         as blended_score
  from scaled s
  order by (alpha * s.vector_score + (1 - alpha) * s.fts_norm) desc
  limit match_limit;
end;
$$;

grant execute on function regwatch.search_internal_documents_hybrid(text, text, int, double precision, uuid[], boolean)
  to authenticated;

comment on function regwatch.search_internal_documents_hybrid(text, text, int, double precision, uuid[], boolean) is
  'Org-scoped (SECURITY INVOKER → RLS) hybrid FTS + self-hosted-vector search over internal documents. Vector lane uses internal_document_embeddings for the current revision; FTS lane mirrors search_internal_documents. Null query_embedding → FTS-only.';
