-- ===========================================================================
-- Vantage — Regulatory sections hierarchy
-- ---------------------------------------------------------------------------
-- One row per node in a publisher's table-of-contents (Title → Chapter →
-- Subchapter → Part → Section for eCFR; analogous trees for EUR-Lex /
-- SASO / etc.). Leaf rows optionally link to the regulatory_items row when
-- the node IS the cited regulation; intermediate rows just describe the
-- structure so the browse UI can render an eCFR-style navigable tree.
--
-- Public corpus — read by everyone, written only by service-role.
-- ===========================================================================

create extension if not exists ltree;

create table regwatch.regulatory_sections (
  id                        uuid primary key default gen_random_uuid(),
  regulator_id              uuid not null references regwatch.regulators(id) on delete cascade,
  jurisdiction_code         text not null,
  parent_section_id         uuid references regwatch.regulatory_sections(id) on delete cascade,

  level                     int  not null check (level between 1 and 8),
  level_label               text not null,
  identifier                text not null,
  title                     text,

  -- When a node IS the cited regulation, the connector populates these so
  -- the browse leaf click jumps to the regulation detail page.
  citation                  text,
  regulatory_item_id        uuid references regwatch.regulatory_items(id) on delete set null,

  -- Denormalised for cheap UI rendering. `path` is the canonical full tree
  -- coordinate (e.g. 'us.cfr.title_1.chapter_i.subchapter_a.part_51'); it's
  -- the unique key so re-syncs are idempotent on identifier rename.
  path                      ltree not null,
  child_count               int not null default 0,
  has_updates_30d           boolean not null default false,
  last_changed_at           timestamptz,

  source_url                text,

  -- Soft-delete: when a node vanishes from the publisher's ToC we leave the
  -- row and null `last_seen_at` so any obligation/document references stay
  -- resolvable. Pruning is manual.
  last_seen_at              timestamptz not null default now(),

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create unique index regulatory_sections_path_uq
  on regwatch.regulatory_sections (path);
create index regulatory_sections_parent_idx
  on regwatch.regulatory_sections (parent_section_id, identifier);
create index regulatory_sections_jurisdiction_idx
  on regwatch.regulatory_sections (jurisdiction_code);
create index regulatory_sections_regulator_idx
  on regwatch.regulatory_sections (regulator_id);
create index regulatory_sections_recent_idx
  on regwatch.regulatory_sections (regulator_id) where has_updates_30d;
create index regulatory_sections_item_idx
  on regwatch.regulatory_sections (regulatory_item_id) where regulatory_item_id is not null;
create index regulatory_sections_path_gist
  on regwatch.regulatory_sections using gist (path);

create trigger regulatory_sections_set_updated_at
  before update on regwatch.regulatory_sections
  for each row execute function regwatch.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table regwatch.regulatory_sections enable row level security;

-- Browse is public — anon + authenticated can read.
drop policy if exists regulatory_sections_public_read on regwatch.regulatory_sections;
create policy regulatory_sections_public_read on regwatch.regulatory_sections
  for select to anon, authenticated
  using (true);

-- Writes only via service-role (cron). No auth-user inserts / updates.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant select on regwatch.regulatory_sections to anon, authenticated;
grant all    on regwatch.regulatory_sections to service_role;

-- ---------------------------------------------------------------------------
-- Helper: refresh has_updates_30d + last_changed_at from current items.
-- Walks bottom-up so each non-leaf node summarises its descendants.
-- Called by the regwatch-hierarchy cron at the end of every sync.
-- ---------------------------------------------------------------------------
create or replace function regwatch.refresh_regulatory_section_recency()
returns void
language plpgsql
security definer
set search_path = regwatch, public
as $$
begin
  -- Leaves: pull from the linked regulatory_item.
  update regwatch.regulatory_sections rs
     set has_updates_30d = (ri.last_changed_at >= now() - interval '30 days'),
         last_changed_at = ri.last_changed_at
    from regwatch.regulatory_items ri
   where rs.regulatory_item_id = ri.id;

  -- Internal nodes: any descendant has_updates_30d=true → roll up.
  -- Single pass via path-prefix join (cheap with the GiST index).
  update regwatch.regulatory_sections parent
     set has_updates_30d = exists (
       select 1
         from regwatch.regulatory_sections child
        where child.path <@ parent.path
          and child.id <> parent.id
          and child.has_updates_30d
     ),
     last_changed_at = (
       select max(child.last_changed_at)
         from regwatch.regulatory_sections child
        where child.path <@ parent.path
          and child.id <> parent.id
     )
   where parent.regulatory_item_id is null;
end;
$$;

grant execute on function regwatch.refresh_regulatory_section_recency() to service_role;
