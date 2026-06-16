-- ============================================================================
-- Vantage Outreach — Phase 2 seed sources
--   1. Synthetic "news-source" regulators for the RSS industry-news connector
--      (items land as instrument_type='notice' so they stay separable from real
--      regulations in the regwatch corpus).
--   2. outreach.topic_calendar — curated evergreen prompts that the
--      outreach-seeds cron rotates into content_seeds for the pillars that have
--      no external data feed (Demo & Product, Authoritative Long-Form), plus a
--      fallback for the data-starved MEA / Standards pillars.
-- Mirrors the admin-only RLS + grant pattern from 20260616_outreach_initial.sql.
-- No new schema is created, so no PostgREST schema-exposure step is needed.
-- ============================================================================

-- ---- 1. News-source regulators (idempotent) --------------------------------
insert into regwatch.regulators
  (slug, name, short_name, jurisdiction_code, jurisdiction_name, region, regulator_type, canonical_url, description, is_active)
values
  ('news-energy', 'Industry News — Energy & Compliance', 'Energy News', 'INT', 'International', 'int', 'news-source',
   'https://www.iea.org', 'Aggregated public RSS feeds covering energy, climate and compliance news. Used as Outreach content seeds (not a regulator).', true),
  ('news-mea', 'Industry News — MEA Region', 'MEA News', 'AE', 'Middle East & Africa', 'mea', 'news-source',
   'https://www.zawya.com', 'Aggregated public RSS feeds covering Middle East & Africa energy and compliance news. Outreach content seeds (not a regulator).', true)
on conflict (slug) do nothing;

-- ---- 2. Topic calendar -----------------------------------------------------
create table if not exists outreach.topic_calendar (
    id uuid primary key default gen_random_uuid(),
    pillar_id uuid not null references outreach.content_pillars(id) on delete cascade,
    title text not null,
    angle text,                                        -- the brief/direction handed to the generator
    geo text[] not null default '{international}',
    cadence_days int not null default 30,              -- min days between firings
    last_used_at timestamptz,
    active boolean not null default true,
    created_at timestamptz not null default now()
);
create index if not exists topic_calendar_active_idx on outreach.topic_calendar (active, last_used_at);

alter table outreach.topic_calendar enable row level security;
drop policy if exists topic_calendar_admin_read on outreach.topic_calendar;
create policy topic_calendar_admin_read on outreach.topic_calendar
  for select to authenticated using (outreach.is_admin());

grant select on outreach.topic_calendar to authenticated;
grant all on outreach.topic_calendar to service_role;

-- ---- 3. Starter evergreen prompts ------------------------------------------
-- Demo & Product Education + Authoritative Long-Form have no data feed, so they
-- live entirely on the calendar. A couple of fallbacks for MEA/Standards keep
-- those pillars from sitting empty between rare matching corpus items.
insert into outreach.topic_calendar (pillar_id, title, angle, geo, cadence_days)
select p.id, v.title, v.angle, v.geo, v.cadence
from (values
  ('demo-product',
   'How a compliance team turns a new regulation into tracked obligations in Vantage',
   'Walk through the Vantage flow: regulation lands -> obligations extracted -> owners + due dates assigned -> evidence tracked. Concrete use-case, end on a soft demo CTA. No hype.',
   array['international']::text[], 21),
  ('demo-product',
   'From 9,000 regulations to the 12 that affect your assets — RegWatch matching explained',
   'Show how RegWatch filters the global corpus down to a facility''s actual obligations via asset + jurisdiction matching. Feature spotlight framed around the buyer''s pain of noise.',
   array['international']::text[], 21),
  ('demo-product',
   'Audit-ready in minutes: evidence trails and the obligation history view',
   'Product education on the audit-trail + evidence features. Frame around an auditor showing up unannounced. Outcome-led, soft CTA.',
   array['international']::text[], 28),
  ('long-form-authority',
   'The late-change cost cascade: why a standards revision is never just a document update',
   'Long-form analyst essay tracing a single standard revision through supplier flow-down, MOC, and engineering rework. Original framing, heavy citation, brand voice (no first-person founder).',
   array['international']::text[], 30),
  ('long-form-authority',
   'Regulatory intelligence as infrastructure, not a newsletter',
   'Thesis essay: compliance monitoring should be a system of record, not a person forwarding PDFs. Build the argument from first principles; cite real regulatory volume.',
   array['international']::text[], 30),
  ('long-form-authority',
   'The compliance data gap in the energy transition',
   'Long-form: as energy firms diversify into renewables/hydrogen/CCUS, their regulatory surface area explodes faster than their compliance teams. Data-grounded, forward-looking.',
   array['international']::text[], 30),
  ('mea-compliance',
   'What GCC operators should watch as environmental regulation tightens',
   'Regional perspective on the direction of GCC environmental/energy regulation. Reference specific bodies (UAE MOCCAE/FANR, Saudi NCEC) where relevant. Measured, regionally credible.',
   array['gcc']::text[], 30),
  ('standards-engineering',
   'Managing standards change across a multi-supplier engineering program',
   'Practitioner piece on flow-down of a standards revision to suppliers and the digital thread. Systems-thinking voice; trace the change end to end.',
   array['international']::text[], 30)
) as v(pillar_slug, title, angle, geo, cadence)
join outreach.content_pillars p on p.slug = v.pillar_slug
where not exists (
  select 1 from outreach.topic_calendar tc where tc.title = v.title
);
