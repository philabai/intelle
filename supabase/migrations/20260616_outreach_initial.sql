-- ============================================================================
-- Vantage Outreach — initial schema (Phase 0)
-- Admin-only marketing-automation engine. Internal (not tenant) data, so RLS is
-- a single platform-admin gate rather than RegWatch's per-org model.
-- Reads go through the authenticated client (RLS: outreach.is_admin); writes go
-- through the service-role client in server actions / crons (which also re-check
-- canManageContent at the app layer). Mirrors the regwatch grant+RLS style.
-- NOTE: expose the `outreach` schema to PostgREST (Settings → API → Exposed
-- schemas: public, graphql_public, regwatch, outreach) or authed reads 404.
-- ============================================================================

create schema if not exists outreach;
create extension if not exists vector;

-- Platform-admin gate, read from the JWT's app_metadata.role claim (same source
-- as src/lib/auth/roles.ts getSessionUser).
create or replace function outreach.is_admin()
returns boolean
language sql
stable
security definer
set search_path = outreach, public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'content_admin'),
    false
  );
$$;

create or replace function outreach.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---- Content pillars & personas -------------------------------------------
create table outreach.content_pillars (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    name text not null,
    description text not null,
    editorial_voice_notes text,
    active boolean not null default true,
    weekly_post_target int not null default 0,
    created_at timestamptz not null default now()
);

create table outreach.personas (
    id uuid primary key default gen_random_uuid(),
    slug text unique not null,
    name text not null,
    geo_region text not null,                          -- gcc | us | canada | india | international
    job_titles text[] not null default '{}',
    company_types text[] not null default '{}',
    named_accounts jsonb not null default '[]'::jsonb,
    pain_points text[] not null default '{}',
    objections text[] not null default '{}',
    proof_points text[] not null default '{}',
    embedding vector(1024),
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- ---- Content seeds & posts -------------------------------------------------
create table outreach.content_seeds (
    id uuid primary key default gen_random_uuid(),
    source_type text not null,                         -- regulator_update | industry_news | topic_calendar | manual
    source_reference_id uuid,                          -- e.g. regwatch.regulatory_items.id
    title text not null,
    summary text not null,
    raw_content text,
    pillar_id uuid references outreach.content_pillars(id),
    geo_relevance text[] not null default '{}',
    persona_relevance uuid[] not null default '{}',
    discovered_at timestamptz not null default now(),
    consumed boolean not null default false,
    consumed_at timestamptz,
    consumed_in_post_id uuid
);
create index on outreach.content_seeds (consumed, pillar_id);
create unique index content_seeds_dedupe_idx
  on outreach.content_seeds (source_type, source_reference_id)
  where source_reference_id is not null;

create table outreach.posts (
    id uuid primary key default gen_random_uuid(),
    pillar_id uuid not null references outreach.content_pillars(id),
    seed_id uuid references outreach.content_seeds(id),

    target_platforms text[] not null default '{}',     -- linkedin | x | newsletter | youtube | ...
    target_geos text[] not null default '{}',
    target_personas uuid[] not null default '{}',

    title text,
    body_long text,
    body_medium text,
    body_short text,
    body_thread jsonb,
    hashtags text[] not null default '{}',
    suggested_media jsonb,
    citations jsonb not null default '[]'::jsonb,
    platform_variants jsonb not null default '{}'::jsonb,

    status text not null default 'draft',              -- draft|pending_review|under_review|approved|scheduled|publishing|published|rejected|failed
    scheduled_for timestamptz,

    reviewer_id uuid references auth.users(id),
    reviewed_at timestamptz,
    review_notes text,
    rejection_reason text,
    ai_confidence numeric(4,3),

    prompt_version text,
    model_used text,
    generation_cost_usd numeric(10,4),
    edit_history jsonb not null default '[]'::jsonb,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index on outreach.posts (status, scheduled_for);
create index on outreach.posts (pillar_id, status);
create trigger posts_set_updated_at before update on outreach.posts
  for each row execute function outreach.set_updated_at();

-- ---- Platform publication tracking ----------------------------------------
create table outreach.platform_connections (
    id uuid primary key default gen_random_uuid(),
    platform text not null,
    handle text not null,
    -- credentials are kept in env (Buffer); this row is metadata/status only.
    oauth_credentials jsonb,
    status text not null default 'active',
    last_used_at timestamptz,
    created_at timestamptz not null default now(),
    unique (platform, handle)
);

create table outreach.publications (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references outreach.posts(id) on delete cascade,
    platform text not null,
    platform_connection_id uuid references outreach.platform_connections(id),
    platform_post_id text,
    platform_url text,
    published_at timestamptz,
    status text not null default 'pending',            -- pending|publishing|published|failed
    error_message text,
    created_at timestamptz not null default now()
);
create index on outreach.publications (post_id);

create table outreach.publication_metrics (
    id uuid primary key default gen_random_uuid(),
    publication_id uuid not null references outreach.publications(id) on delete cascade,
    fetched_at timestamptz not null default now(),
    impressions int, reach int, likes int, comments int, shares int, clicks int,
    raw_metrics jsonb
);

-- ---- Editorial calendar ----------------------------------------------------
create table outreach.calendar_events (
    id uuid primary key default gen_random_uuid(),
    date date not null,
    pillar_id uuid references outreach.content_pillars(id),
    persona_id uuid references outreach.personas(id),
    geo text,
    platform text,
    intent text,                                       -- announce|educate|opinion|newsjack|demo_cta
    post_id uuid references outreach.posts(id),
    status text not null default 'planned',
    notes text
);
create index on outreach.calendar_events (date);

-- ---- Audit log -------------------------------------------------------------
create table outreach.audit_log (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references auth.users(id),
    action text not null,
    target_type text not null,
    target_id uuid,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- ---- LLM cost / usage tracking (new — brief Section 1) ---------------------
create table outreach.llm_calls (
    id uuid primary key default gen_random_uuid(),
    post_id uuid references outreach.posts(id) on delete set null,
    purpose text not null,                             -- long_form|variants|hashtags|quality_check|seed_tagging|adhoc
    model text not null,
    prompt_version text,
    input_tokens int,
    output_tokens int,
    cost_usd numeric(10,4),
    created_at timestamptz not null default now()
);
create index on outreach.llm_calls (created_at);

-- ---- RLS: admin-only -------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'content_pillars','personas','content_seeds','posts','platform_connections',
    'publications','publication_metrics','calendar_events','audit_log','llm_calls'
  ] loop
    execute format('alter table outreach.%I enable row level security;', t);
    -- Authenticated admins may READ; writes happen via the service-role client
    -- in server actions/crons (which bypass RLS and re-check admin at app layer).
    execute format(
      'create policy %I on outreach.%I for select to authenticated using (outreach.is_admin());',
      t || '_admin_read', t);
  end loop;
end $$;

-- ---- Grants (PostgREST needs these; RLS then gates) ------------------------
grant usage on schema outreach to anon, authenticated, service_role;
grant select on all tables in schema outreach to authenticated;
grant all on all tables in schema outreach to service_role;
grant execute on function outreach.is_admin() to anon, authenticated, service_role;
alter default privileges in schema outreach grant select on tables to authenticated;
alter default privileges in schema outreach grant all on tables to service_role;

-- ---- Seed the 6 content pillars (brief Section 6) --------------------------
insert into outreach.content_pillars (slug, name, description, weekly_post_target, editorial_voice_notes) values
 ('regulatory-briefings', 'Regulatory Update Briefings',
  'Brand-voice synthesis of newly published regulations relevant to compliance buyers — names the regulator, the change, affected operations, and business consequence. Citation-disciplined. Drives RegWatch demand.',
  5, 'Measured analyst tone. Always cite the regulator + instrument. No alarmism. Lead with the business consequence.'),
 ('mea-compliance', 'MEA Compliance Perspectives',
  'Regional content on UAE FANR/MOCCAE/EAD, Saudi NCEC, GCC environmental & energy regulatory developments. intelle.io''s strongest regional credibility.',
  3, 'Regionally authoritative; reference the specific GCC regulator/programme. English MSA-adjacent clarity.'),
 ('standards-engineering', 'Standards & Engineering Change',
  'Standards revision cascades, supplier flow-down, MOC operational change. Builds on the late-change cost-cascade thesis. Engineering-buyer adjacent.',
  3, 'Practitioner, systems-thinking voice. Trace the change through the digital thread. No founder first-person.'),
 ('industry-newsjack', 'Industry Newsjack',
  'Time-sensitive commentary on regulator decisions, enforcement actions, headline industry events. Published within hours of the trigger.',
  3, 'Fast, sharp, still cited. React to the event; tie back to compliance/monitoring. Never speculative rumor.'),
 ('demo-product', 'Demo & Product Education',
  'Vantage product-led content — feature spotlights, use-case walkthroughs, customer-outcome framing. Drives signups and demos.',
  2, 'Show, don''t tell. Concrete use-case + outcome. End on a soft demo CTA.'),
 ('long-form-authority', 'Authoritative Long-Form',
  'Founder-POV-style long-form on intelle.io/insights, syndicated to LinkedIn. The slow-compounding authority play.',
  0, 'Long-form analyst essay. Brand voice (no first-person founder). Heavy citation; original framing.')
on conflict (slug) do nothing;
