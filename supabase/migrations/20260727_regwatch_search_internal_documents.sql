-- ===========================================================================
-- RegWatch — search_internal_documents: org-scoped FTS over Company Documents
-- ---------------------------------------------------------------------------
-- Powers the "Company Docs" source on the Search page. Internal documents are
-- small per org (tens, not thousands), so we do INLINE full-text search — no
-- maintained tsvector column, no GIN index, no backfill (kind to the instance).
--
-- SECURITY INVOKER (the default): the function runs with the caller's rights,
-- so the internal_documents RLS policy (members read only their own org) scopes
-- results automatically — no explicit org filter needed, and no way to read
-- another org's documents.
--
-- Searchable text = title + internal_code + description + the CURRENT revision's
-- body_text (joined via internal_documents.current_revision_id). Folder scoping:
--   * folder_ids empty/null AND not include_unfiled → no folder filter (all).
--   * folder_ids set            → documents in those folders (caller passes the
--                                 selected folders PLUS their descendants).
--   * include_unfiled           → also documents with folder_id IS NULL.
-- ===========================================================================

drop function if exists regwatch.search_internal_documents(text, uuid[], boolean);

create or replace function regwatch.search_internal_documents(
  query_text      text,
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
  rank           double precision
)
language plpgsql
stable
set search_path = regwatch, public
as $$
declare
  qts tsquery;
begin
  begin
    qts := websearch_to_tsquery('english', coalesce(query_text, ''));
  exception when others then
    qts := null;
  end;
  if qts is null or numnode(qts) = 0 then
    return;  -- empty / unparseable query → no rows
  end if;

  return query
  with scored as (
    select
      d.id,
      d.title,
      d.doc_kind::text       as doc_kind,
      d.internal_code,
      d.version,
      d.status::text         as status,
      d.folder_id,
      d.updated_at,
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
        -- nothing selected → no folder restriction (all company docs)
        ((folder_ids is null or cardinality(folder_ids) = 0) and not include_unfiled)
        -- selected real folders (caller expands to include descendants)
        or (folder_ids is not null and d.folder_id = any(folder_ids))
        -- the "Unfiled" pseudo-folder
        or (include_unfiled and d.folder_id is null)
      )
  ),
  matched as (
    select s.*, ts_rank_cd(s.tsv, qts) as rk
    from scored s
    where s.tsv @@ qts
    order by ts_rank_cd(s.tsv, qts) desc
    limit 25
  )
  select
    m.id,
    m.title,
    m.doc_kind,
    m.internal_code,
    m.version,
    m.status,
    m.folder_id,
    m.updated_at,
    -- Non-HTML highlight markers (⟦ … ⟧) so the client can render highlights as
    -- escaped React text, never raw HTML.
    ts_headline(
      'english',
      coalesce(m.body_text, m.title),
      qts,
      'StartSel=⟦,StopSel=⟧,MaxFragments=2,MaxWords=20,MinWords=6,ShortWord=2,FragmentDelimiter= … '
    ) as snippet,
    m.rk::double precision as rank
  from matched m;
end;
$$;

grant execute on function regwatch.search_internal_documents(text, uuid[], boolean)
  to authenticated;

comment on function regwatch.search_internal_documents(text, uuid[], boolean) is
  'Org-scoped (SECURITY INVOKER → RLS) full-text search over internal documents: title + internal_code + description + current revision body_text. Folder-filtered (caller expands to descendants; include_unfiled covers folder_id IS NULL). Inline FTS — no index, sized for small per-org corpora.';
