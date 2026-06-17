-- ============================================================================
-- Vantage Outreach — generation config (editable prompts + quality bar)
-- A single-row table holding the live, admin-editable generation settings:
--   - quality_target: the confidence bar a draft must reach (revise-until)
--   - max_revisions:  how many revise passes the loop may run
--   - compose / quality_check / revise prompts: the actual system prompts
--   - characteristics: toggleable extra requirements appended to the compose
--     prompt ([{ id, label, instruction, enabled }])
-- The app auto-seeds this row from the shipped .md defaults on first read, so
-- this migration only creates the (empty) table + RLS. No schema exposure step.
-- ============================================================================

create table if not exists outreach.generation_config (
    id uuid primary key default gen_random_uuid(),
    singleton boolean not null default true unique,    -- enforce exactly one row
    quality_target numeric(4,3) not null default 0.95,
    max_revisions int not null default 2,
    compose_prompt text not null default '',
    quality_check_prompt text not null default '',
    revise_prompt text not null default '',
    characteristics jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users(id)
);

alter table outreach.generation_config enable row level security;
drop policy if exists generation_config_admin_read on outreach.generation_config;
create policy generation_config_admin_read on outreach.generation_config
  for select to authenticated using (outreach.is_admin());

grant select on outreach.generation_config to authenticated;
grant all on outreach.generation_config to service_role;
