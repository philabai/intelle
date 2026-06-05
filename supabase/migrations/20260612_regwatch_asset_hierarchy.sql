-- ===========================================================================
-- RegWatch — Asset hierarchy (Phase 1 of the Asset Management feature)
-- ---------------------------------------------------------------------------
-- Per-org asset tree, self-referential through `parent_id`, with a configurable
-- label per level so an O&G org sees "Process Unit" where a hospital sees
-- "Department". Five fixed levels (L2-L5 + optional L6); L1 is the
-- organization itself and lives in regwatch.organizations.
--
-- Levels:
--   L2  Site                 (refinery, FPSO, hospital, plant, wind farm)
--   L3  Area / Process Unit  (CDU, paint booth, ICU, turbine string)
--   L4  Asset Class          (centrifugal pump, MRI scanner, transformer)
--   L5  Asset / Tag          (P-101A, MR-3, WTG-12)
--   L6  Component (opt-in)   (PSV, gearbox, sensor train) — Enterprise tier
--
-- Reuses the canonical org-member RLS pattern: SELECT for any member,
-- INSERT/UPDATE/DELETE for org admins only (new is_org_admin() helper).
-- ===========================================================================

-- ===========================================================================
-- Helper: does the calling user have admin/owner role in this org?
-- Mirrors the ensureAdmin() server-side check; used by every admin-write RLS
-- policy on the new tables.
-- ===========================================================================
create or replace function regwatch.is_org_admin(target_org uuid)
returns boolean
language sql
security definer
stable
set search_path = regwatch, public
as $$
  select exists (
    select 1
    from regwatch.organization_members m
    where m.organization_id = target_org
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  );
$$;

grant execute on function regwatch.is_org_admin(uuid) to authenticated;

-- ===========================================================================
-- asset_hierarchy_config — one row per org; configurable level labels
-- ===========================================================================
create table regwatch.asset_hierarchy_config (
  id                uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references regwatch.organizations(id) on delete cascade,

  level_2_label    text not null default 'Site',
  level_3_label    text not null default 'Area',
  level_4_label    text not null default 'Asset Class',
  level_5_label    text not null default 'Asset',
  level_6_enabled  boolean not null default false,
  level_6_label    text default 'Component',

  -- Industry starter pack used to seed L3 + L4 nodes (one of:
  -- 'iso-14224', 'gmdn', 'ata-100', 'rds-pp', 'isa-95', or NULL for empty).
  starter_pack    text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id)
);

create trigger asset_hierarchy_config_set_updated_at
  before update on regwatch.asset_hierarchy_config
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- assets — self-referential tree
-- ===========================================================================
create table regwatch.assets (
  id                uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references regwatch.organizations(id) on delete cascade,
  parent_id        uuid references regwatch.assets(id) on delete cascade,
  level            smallint not null check (level between 2 and 6),

  name             text not null,
  -- External code: SAP PM functional location, RDS-PP designation,
  -- GMDN code, asset tag #, etc. Allows customers to plug into their EAM.
  code             text,
  -- Either free-text or a value drawn from the active starter pack
  -- (e.g. 'centrifugal-pump' from ISO 14224).
  asset_type       text,
  -- Defaults to the Site's jurisdiction; overrideable at any level.
  jurisdiction_code text,

  substances_cas   text[] not null default '{}',
  permits          jsonb not null default '{}'::jsonb,
  tags             text[] not null default '{}',
  metadata         jsonb not null default '{}'::jsonb,

  created_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);

create index assets_org_level_idx     on regwatch.assets (organization_id, level);
create index assets_parent_idx        on regwatch.assets (parent_id);
create index assets_org_code_idx      on regwatch.assets (organization_id, code) where code is not null;
create index assets_org_archived_idx  on regwatch.assets (organization_id) where archived_at is null;

create trigger assets_set_updated_at
  before update on regwatch.assets
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- RLS — members read, admins write
-- ===========================================================================
alter table regwatch.asset_hierarchy_config enable row level security;
alter table regwatch.assets                  enable row level security;

drop policy if exists asset_hierarchy_config_member_read on regwatch.asset_hierarchy_config;
create policy asset_hierarchy_config_member_read on regwatch.asset_hierarchy_config
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists asset_hierarchy_config_admin_write on regwatch.asset_hierarchy_config;
create policy asset_hierarchy_config_admin_write on regwatch.asset_hierarchy_config
  for insert to authenticated
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists asset_hierarchy_config_admin_update on regwatch.asset_hierarchy_config;
create policy asset_hierarchy_config_admin_update on regwatch.asset_hierarchy_config
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists assets_member_read on regwatch.assets;
create policy assets_member_read on regwatch.assets
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

drop policy if exists assets_admin_insert on regwatch.assets;
create policy assets_admin_insert on regwatch.assets
  for insert to authenticated
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists assets_admin_update on regwatch.assets;
create policy assets_admin_update on regwatch.assets
  for update to authenticated
  using (regwatch.is_org_member(organization_id))
  with check (regwatch.is_org_admin(organization_id));

drop policy if exists assets_admin_delete on regwatch.assets;
create policy assets_admin_delete on regwatch.assets
  for delete to authenticated
  using (regwatch.is_org_admin(organization_id));

-- ===========================================================================
-- Grants
-- ===========================================================================
grant select on regwatch.asset_hierarchy_config to authenticated;
grant insert, update on regwatch.asset_hierarchy_config to authenticated;

grant select on regwatch.assets to authenticated;
grant insert, update, delete on regwatch.assets to authenticated;
