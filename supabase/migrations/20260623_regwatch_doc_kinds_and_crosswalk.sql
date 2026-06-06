-- ===========================================================================
-- RegWatch — Internal documents: extended kinds + clause crosswalk
-- ---------------------------------------------------------------------------
-- Two unrelated tweaks shipped together for migration economy:
--
-- 1. Extend internal_document_kind with the seven categories customers asked
--    for: internal-standard, regulation, test-plan, project-document,
--    lessons-learnt, design-document, drawing. `IF NOT EXISTS` so this stays
--    safe to re-run.
--
-- 2. Add internal_clause_anchor TEXT to internal_document_regulation_links so
--    a single junction table can back both:
--      * Document-level links (whole-doc → whole-reg) — both anchors NULL
--      * Clause crosswalk (internal_clause_anchor + clause_anchor both SET) —
--        e.g. "SOP §4.2 → CBAM Article 6(2)"
--    Existing rows keep the same semantics; the new column defaults to NULL
--    so doc-level links are unaffected.
--
-- The existing partial unique index already keyed on
-- (org, doc, reg, coalesce(clause_anchor, '')) is preserved as-is — the
-- crosswalk vs doc-level distinction is enforced at the application layer
-- via a "kind" derivation (both anchors null vs both anchors set).
-- ===========================================================================

alter type regwatch.internal_document_kind add value if not exists 'internal-standard';
alter type regwatch.internal_document_kind add value if not exists 'regulation';
alter type regwatch.internal_document_kind add value if not exists 'test-plan';
alter type regwatch.internal_document_kind add value if not exists 'project-document';
alter type regwatch.internal_document_kind add value if not exists 'lessons-learnt';
alter type regwatch.internal_document_kind add value if not exists 'design-document';
alter type regwatch.internal_document_kind add value if not exists 'drawing';

alter table regwatch.internal_document_regulation_links
  add column if not exists internal_clause_anchor text;

create index if not exists internal_doc_link_internal_clause_idx
  on regwatch.internal_document_regulation_links (internal_document_id)
  where internal_clause_anchor is not null and superseded_at is null;
