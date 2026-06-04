-- ============================================================================
-- RegWatch — initial schema (Phase 0 Foundation)
--
-- Pull-model dashboard SaaS that monitors regulatory changes across global
-- energy / environmental / industrial / chemical regulators and delivers
-- footprint-aware impact analysis to compliance / EHS / legal teams.
--
-- Surfaces (per A.3 MVP): Global Regulations Browser (public-readable),
-- Search (Claude Q&A + keyword + semantic), Relevance Feed (org-scoped,
-- footprint-scored), Regulation Detail, Iris Concierge, Footprint
-- Configurator, Alerts, Saved/My RegWatch, Account & Members.
--
-- RLS model:
--   regulators + regulatory_items + regulation_topics → globally readable
--     (public corpus is the Plan A lead-magnet pattern)
--   everything else → org-scoped via organization_members
--   alert_preferences + alert_deliveries → user-scoped (auth.uid())
--
-- Embeddings: vector(1024) sized for Voyage AI voyage-3-large.
-- ============================================================================

create extension if not exists "vector";

create schema if not exists regwatch;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function regwatch.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===========================================================================
-- 1. regulators — globally readable corpus dimension
-- ===========================================================================
create table regwatch.regulators (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  short_name        text,
  jurisdiction_code text not null,         -- 'US','EU','UK','AE','SA','QA','INT', etc.
  jurisdiction_name text not null,
  region            text not null,         -- 'na','eu','uk','mea','asia','lac','int'
  regulator_type    text not null,         -- 'federal-agency','commission','authority','standards-body','international-body'
  canonical_url     text,
  description       text,
  topic_domains     text[] not null default '{}',
  crawl_config      jsonb not null default '{}'::jsonb,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index regulators_region_idx           on regwatch.regulators (region);
create index regulators_jurisdiction_idx     on regwatch.regulators (jurisdiction_code);
create index regulators_topic_domains_gin    on regwatch.regulators using gin (topic_domains);
create index regulators_is_active_idx        on regwatch.regulators (is_active) where is_active;

create trigger regulators_set_updated_at
  before update on regwatch.regulators
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- 2. regulatory_items — globally readable corpus body + embedding
-- ===========================================================================
create table regwatch.regulatory_items (
  id                       uuid primary key default gen_random_uuid(),
  regulator_id             uuid not null references regwatch.regulators(id) on delete cascade,
  citation                 text not null,                -- '40 CFR 261.4', 'Regulation (EU) 2023/1115', 'SI 2024/123', 'CELEX:32023R1115'
  slug                     text not null,                -- URL-safe form of citation
  title                    text not null,
  instrument_type          text not null,                -- 'primary-legislation','secondary-legislation','guidance','consultation','enforcement','standard','proposed-rule','final-rule','notice'
  status                   text not null default 'in-force', -- 'proposed','in-force','amended','superseded','repealed','consultation-open','consultation-closed'
  effective_date           date,
  proposed_date            date,
  consultation_closes_at   timestamptz,
  published_at             timestamptz not null default now(),
  last_changed_at          timestamptz not null default now(),
  source_url               text not null,                -- regulator's canonical URL
  summary                  text,                         -- AI-generated plain-English summary
  body_text                text,                         -- full text body (for FTS)
  body_html                text,                         -- formatted body (for reader)
  body_search              tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(citation, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body_text, '')), 'C')
  ) stored,
  jurisdiction_code        text not null,
  topics                   text[] not null default '{}',  -- curated topic taxonomy: emissions / methane / reporting / permitting / bunker-spec / carbon-market / pfas / tax / sanctions / worker-safety / process-safety
  substances_cas           text[] not null default '{}',  -- CAS numbers referenced
  naics_codes              text[] not null default '{}',
  isic_codes               text[] not null default '{}',
  nace_codes               text[] not null default '{}',
  embedding                vector(1024),                  -- voyage-3-large dimension
  enrichment_status        text not null default 'pending', -- 'pending','enriching','enriched','failed'
  enrichment_metadata      jsonb not null default '{}'::jsonb,
  ingested_at              timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (regulator_id, citation)
);

create index regulatory_items_body_search_gin   on regwatch.regulatory_items using gin (body_search);
create index regulatory_items_topics_gin        on regwatch.regulatory_items using gin (topics);
create index regulatory_items_substances_gin    on regwatch.regulatory_items using gin (substances_cas);
create index regulatory_items_naics_gin         on regwatch.regulatory_items using gin (naics_codes);
create index regulatory_items_isic_gin          on regwatch.regulatory_items using gin (isic_codes);
create index regulatory_items_nace_gin          on regwatch.regulatory_items using gin (nace_codes);
create index regulatory_items_regulator_idx     on regwatch.regulatory_items (regulator_id);
create index regulatory_items_jurisdiction_idx  on regwatch.regulatory_items (jurisdiction_code);
create index regulatory_items_status_idx        on regwatch.regulatory_items (status);
create index regulatory_items_published_idx     on regwatch.regulatory_items (published_at desc);
create index regulatory_items_last_changed_idx  on regwatch.regulatory_items (last_changed_at desc);
create index regulatory_items_effective_idx     on regwatch.regulatory_items (effective_date);
create index regulatory_items_slug_idx          on regwatch.regulatory_items (slug);
-- ivfflat needs at least one row to ANALYZE before query planner uses it;
-- this is fine for an initially-empty corpus, Postgres will rebuild on data load.
create index regulatory_items_embedding_idx     on regwatch.regulatory_items using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create trigger regulatory_items_set_updated_at
  before update on regwatch.regulatory_items
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- 3. organizations — tenants
-- ===========================================================================
create table regwatch.organizations (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  name                   text not null,
  tier                   text not null default 'free',  -- 'free','pro','team','enterprise'
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index organizations_tier_idx on regwatch.organizations (tier);

create trigger organizations_set_updated_at
  before update on regwatch.organizations
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- 4. organization_members — auth.users ↔ organizations
-- ===========================================================================
create table regwatch.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references regwatch.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'owner', -- 'owner','admin','cco','ehs-manager','legal-counsel','esg-lead','gov-affairs','member'
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on regwatch.organization_members (user_id);
create index organization_members_org_idx  on regwatch.organization_members (organization_id);

-- Helper: does the calling user belong to this org? Used by every org-scoped RLS policy.
create or replace function regwatch.is_org_member(target_org uuid)
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
  );
$$;

-- ===========================================================================
-- 5. operations_footprints — one footprint per org (v1)
-- ===========================================================================
create table regwatch.operations_footprints (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references regwatch.organizations(id) on delete cascade,
  name                        text not null default 'Default footprint',
  geographies                 text[] not null default '{}',  -- country + subregion codes
  activities_naics            text[] not null default '{}',
  activities_isic             text[] not null default '{}',
  activities_nace             text[] not null default '{}',
  monitored_regulator_slugs   text[] not null default '{}',  -- regulator slugs (stable across reseeds)
  monitored_topics            text[] not null default '{}',
  substances_cas              text[] not null default '{}',
  is_configured               boolean not null default false,
  configured_at               timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index footprints_org_idx                 on regwatch.operations_footprints (organization_id);
create index footprints_geographies_gin         on regwatch.operations_footprints using gin (geographies);
create index footprints_naics_gin               on regwatch.operations_footprints using gin (activities_naics);
create index footprints_topics_gin              on regwatch.operations_footprints using gin (monitored_topics);
create index footprints_regulators_gin          on regwatch.operations_footprints using gin (monitored_regulator_slugs);
create index footprints_substances_gin          on regwatch.operations_footprints using gin (substances_cas);

create trigger footprints_set_updated_at
  before update on regwatch.operations_footprints
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- 6. facilities — assets that compose a footprint
-- ===========================================================================
create table regwatch.facilities (
  id                  uuid primary key default gen_random_uuid(),
  footprint_id        uuid not null references regwatch.operations_footprints(id) on delete cascade,
  organization_id     uuid not null references regwatch.organizations(id) on delete cascade,
  name                text not null,
  asset_type          text not null,           -- ISO 14224-aligned: 'offshore-platform','fpso','well','pipeline','refinery','lng-terminal','storage','bunker-barge','tanker','retail','petrochemical-plant','other'
  segment             text not null,           -- 'upstream','midstream','downstream','other'
  jurisdiction_code   text,                    -- where the asset sits
  substances_cas      text[] not null default '{}',
  permits             jsonb not null default '[]'::jsonb,  -- structured permit entries
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index facilities_footprint_idx      on regwatch.facilities (footprint_id);
create index facilities_org_idx            on regwatch.facilities (organization_id);
create index facilities_segment_idx        on regwatch.facilities (segment);
create index facilities_substances_gin     on regwatch.facilities using gin (substances_cas);

create trigger facilities_set_updated_at
  before update on regwatch.facilities
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- 7. footprint_matches — scored relevance between regulatory_items and footprints
-- ===========================================================================
create table regwatch.footprint_matches (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references regwatch.organizations(id) on delete cascade,
  footprint_id         uuid not null references regwatch.operations_footprints(id) on delete cascade,
  regulatory_item_id   uuid not null references regwatch.regulatory_items(id) on delete cascade,
  score                numeric(5,2) not null,    -- 0.00 to 100.00
  severity             text not null default 'normal', -- 'low','normal','high','critical'
  match_reason         jsonb not null default '{}'::jsonb, -- which facets matched
  assigned_to          uuid references auth.users(id) on delete set null,
  seen_at              timestamptz,
  resolved_at          timestamptz,
  matched_at           timestamptz not null default now(),
  unique (footprint_id, regulatory_item_id)
);

create index matches_org_idx               on regwatch.footprint_matches (organization_id);
create index matches_footprint_idx         on regwatch.footprint_matches (footprint_id);
create index matches_item_idx              on regwatch.footprint_matches (regulatory_item_id);
create index matches_severity_idx          on regwatch.footprint_matches (severity);
create index matches_score_idx             on regwatch.footprint_matches (score desc);
create index matches_assigned_idx          on regwatch.footprint_matches (assigned_to);
create index matches_matched_at_idx        on regwatch.footprint_matches (matched_at desc);

-- ===========================================================================
-- 8. impact_briefings — Claude-generated 4-section briefings
-- ===========================================================================
create table regwatch.impact_briefings (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references regwatch.organizations(id) on delete cascade,
  regulatory_item_id  uuid not null references regwatch.regulatory_items(id) on delete cascade,
  footprint_id        uuid not null references regwatch.operations_footprints(id) on delete cascade,
  headline            text not null,
  why_it_matters      text not null,
  details             text not null,
  what_to_do_now      text not null,
  deeper_resources    text,
  citations           jsonb not null default '[]'::jsonb, -- structured citations + trust markers
  trust_markers       jsonb not null default '{}'::jsonb, -- green / amber / red counts
  generation_metadata jsonb not null default '{}'::jsonb,
  requested_by        uuid references auth.users(id) on delete set null,
  generated_at        timestamptz not null default now()
);

create index briefings_org_idx        on regwatch.impact_briefings (organization_id);
create index briefings_item_idx       on regwatch.impact_briefings (regulatory_item_id);
create index briefings_footprint_idx  on regwatch.impact_briefings (footprint_id);
create index briefings_generated_idx  on regwatch.impact_briefings (generated_at desc);

-- ===========================================================================
-- 9. alert_preferences — per-user, per-channel notification config
-- ===========================================================================
create table regwatch.alert_preferences (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references regwatch.organizations(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  saved_view_id       uuid,                              -- null = global default; future FK to saved_views
  channel             text not null,                     -- 'in-app','email','web-push'
  frequency           text not null default 'off',       -- 'off','weekly','daily' (NEVER hourly — anti-pattern)
  critical_only       boolean not null default false,    -- severity-threshold gating
  severity_threshold  text not null default 'critical',  -- 'low','normal','high','critical'
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, saved_view_id, channel)
);

create index alert_prefs_user_idx     on regwatch.alert_preferences (user_id);
create index alert_prefs_org_idx      on regwatch.alert_preferences (organization_id);
create index alert_prefs_channel_idx  on regwatch.alert_preferences (channel);

create trigger alert_prefs_set_updated_at
  before update on regwatch.alert_preferences
  for each row execute function regwatch.set_updated_at();

-- ===========================================================================
-- 10. alert_deliveries — idempotency record for sent alerts
-- ===========================================================================
create table regwatch.alert_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references regwatch.organizations(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,
  regulatory_item_id  uuid not null references regwatch.regulatory_items(id) on delete cascade,
  channel             text not null,                     -- 'in-app','email','web-push'
  delivery_status     text not null default 'sent',     -- 'sent','failed','bounced'
  delivery_metadata   jsonb not null default '{}'::jsonb,
  delivered_at        timestamptz not null default now(),
  unique (user_id, regulatory_item_id, channel)
);

create index alert_deliveries_user_idx       on regwatch.alert_deliveries (user_id);
create index alert_deliveries_org_idx        on regwatch.alert_deliveries (organization_id);
create index alert_deliveries_item_idx       on regwatch.alert_deliveries (regulatory_item_id);
create index alert_deliveries_delivered_idx  on regwatch.alert_deliveries (delivered_at desc);

-- ===========================================================================
-- 11. audit_log — security + activity trail
-- ===========================================================================
create table regwatch.audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references regwatch.organizations(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  action          text not null,
  entity_type     text,
  entity_id       uuid,
  metadata        jsonb not null default '{}'::jsonb,
  ip_addr         inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);

create index audit_log_org_idx        on regwatch.audit_log (organization_id);
create index audit_log_user_idx       on regwatch.audit_log (user_id);
create index audit_log_entity_idx     on regwatch.audit_log (entity_type, entity_id);
create index audit_log_created_idx    on regwatch.audit_log (created_at desc);

-- ===========================================================================
-- Auto-provision org + owner membership on user signup
-- ===========================================================================
create or replace function regwatch.handle_new_user_provisioning()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
declare
  new_org_id uuid;
  base_slug  text;
  final_slug text;
  attempt    int := 0;
begin
  -- Derive a slug from the email local part, fall back to a uuid fragment.
  base_slug := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
  if base_slug is null or length(base_slug) = 0 then
    base_slug := 'org';
  end if;
  final_slug := base_slug;

  -- Resolve slug collisions with a numeric suffix.
  while exists (select 1 from regwatch.organizations where slug = final_slug) and attempt < 50 loop
    attempt := attempt + 1;
    final_slug := base_slug || '-' || attempt::text;
  end loop;

  insert into regwatch.organizations (slug, name, tier)
  values (final_slug, coalesce(new.raw_user_meta_data ->> 'org_name', initcap(replace(base_slug, '-', ' '))), 'free')
  returning id into new_org_id;

  insert into regwatch.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  -- Seed an empty footprint so the user lands with a configurable surface.
  insert into regwatch.operations_footprints (organization_id, name, is_configured)
  values (new_org_id, 'Default footprint', false);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_regwatch on auth.users;
create trigger on_auth_user_created_regwatch
  after insert on auth.users
  for each row execute function regwatch.handle_new_user_provisioning();

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table regwatch.regulators            enable row level security;
alter table regwatch.regulatory_items      enable row level security;
alter table regwatch.organizations         enable row level security;
alter table regwatch.organization_members  enable row level security;
alter table regwatch.operations_footprints enable row level security;
alter table regwatch.facilities            enable row level security;
alter table regwatch.footprint_matches     enable row level security;
alter table regwatch.impact_briefings      enable row level security;
alter table regwatch.alert_preferences     enable row level security;
alter table regwatch.alert_deliveries      enable row level security;
alter table regwatch.audit_log             enable row level security;

-- ---- Globally readable corpus (regulators + regulatory_items) -------------
-- The corpus is public — Plan A Policy Centre pattern — so anon + authed roles
-- can SELECT freely. Mutations are service-role only (RLS denies them implicitly
-- because no policy grants INSERT/UPDATE/DELETE to anon/authed).
create policy regulators_public_read
  on regwatch.regulators for select
  to anon, authenticated
  using (true);

create policy regulatory_items_public_read
  on regwatch.regulatory_items for select
  to anon, authenticated
  using (true);

-- ---- organizations: members only ------------------------------------------
create policy organizations_member_read
  on regwatch.organizations for select
  to authenticated
  using (regwatch.is_org_member(id));

create policy organizations_owner_update
  on regwatch.organizations for update
  to authenticated
  using (
    exists (
      select 1 from regwatch.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- ---- organization_members: visible to fellow members; owners manage -------
create policy org_members_self_or_peer_read
  on regwatch.organization_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or regwatch.is_org_member(organization_id)
  );

create policy org_members_owner_insert
  on regwatch.organization_members for insert
  to authenticated
  with check (
    exists (
      select 1 from regwatch.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

create policy org_members_owner_delete
  on regwatch.organization_members for delete
  to authenticated
  using (
    exists (
      select 1 from regwatch.organization_members m
      where m.organization_id = organization_members.organization_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin')
    )
  );

-- ---- operations_footprints: org-scoped CRUD -------------------------------
create policy footprints_member_read
  on regwatch.operations_footprints for select
  to authenticated
  using (regwatch.is_org_member(organization_id));

create policy footprints_member_insert
  on regwatch.operations_footprints for insert
  to authenticated
  with check (regwatch.is_org_member(organization_id));

create policy footprints_member_update
  on regwatch.operations_footprints for update
  to authenticated
  using (regwatch.is_org_member(organization_id));

create policy footprints_member_delete
  on regwatch.operations_footprints for delete
  to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---- facilities: org-scoped CRUD ------------------------------------------
create policy facilities_member_read
  on regwatch.facilities for select
  to authenticated
  using (regwatch.is_org_member(organization_id));

create policy facilities_member_insert
  on regwatch.facilities for insert
  to authenticated
  with check (regwatch.is_org_member(organization_id));

create policy facilities_member_update
  on regwatch.facilities for update
  to authenticated
  using (regwatch.is_org_member(organization_id));

create policy facilities_member_delete
  on regwatch.facilities for delete
  to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---- footprint_matches: org-scoped read; mutations service-role ----------
-- (The matching pipeline writes via service role; users only read + assign.)
create policy matches_member_read
  on regwatch.footprint_matches for select
  to authenticated
  using (regwatch.is_org_member(organization_id));

create policy matches_member_update
  on regwatch.footprint_matches for update
  to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---- impact_briefings: org-scoped read; pipeline writes via service-role -
create policy briefings_member_read
  on regwatch.impact_briefings for select
  to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---- alert_preferences: user-scoped --------------------------------------
create policy alert_prefs_user_read
  on regwatch.alert_preferences for select
  to authenticated
  using (user_id = auth.uid());

create policy alert_prefs_user_insert
  on regwatch.alert_preferences for insert
  to authenticated
  with check (user_id = auth.uid() and regwatch.is_org_member(organization_id));

create policy alert_prefs_user_update
  on regwatch.alert_preferences for update
  to authenticated
  using (user_id = auth.uid());

create policy alert_prefs_user_delete
  on regwatch.alert_preferences for delete
  to authenticated
  using (user_id = auth.uid());

-- ---- alert_deliveries: user-scoped read ----------------------------------
create policy alert_deliveries_user_read
  on regwatch.alert_deliveries for select
  to authenticated
  using (user_id = auth.uid());

-- ---- audit_log: org-scoped read; service-role inserts only --------------
create policy audit_log_member_read
  on regwatch.audit_log for select
  to authenticated
  using (organization_id is not null and regwatch.is_org_member(organization_id));

-- ===========================================================================
-- Schema usage grants
-- ===========================================================================
grant usage on schema regwatch to anon, authenticated, service_role;
grant select on regwatch.regulators       to anon, authenticated;
grant select on regwatch.regulatory_items to anon, authenticated;
grant select, insert, update, delete on all tables in schema regwatch to authenticated;
grant all on all tables in schema regwatch to service_role;
grant execute on function regwatch.is_org_member(uuid)               to authenticated;
grant execute on function regwatch.set_updated_at()                  to authenticated, service_role;
grant execute on function regwatch.handle_new_user_provisioning()    to service_role;

-- ===========================================================================
-- End of 20260602_regwatch_initial.sql
-- ===========================================================================
