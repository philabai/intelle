-- ===========================================================================
-- RegWatch — obligation_state_history (Phase 2 of Asset Management)
-- ---------------------------------------------------------------------------
-- Audit trail for the compliance_obligations state machine. Every transition
-- (including the synthetic 'open' → 'awaiting-triage' on first assignment)
-- writes a row here. Used for:
--   1. The state-history timeline on the obligation detail page.
--   2. Audit exports — every transition has an actor + timestamp +
--      optional notes (sign-off rationale, kick-back reason, NA rationale).
--   3. SLA reporting in Phase 4 (time-in-state).
--
-- An AFTER UPDATE trigger on compliance_obligations records the transition
-- whenever review_status changes. INSERT also writes a creation event so
-- the timeline starts from the open-state row.
-- ===========================================================================

create table regwatch.obligation_state_history (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references regwatch.organizations(id) on delete cascade,
  obligation_id   uuid not null references regwatch.compliance_obligations(id) on delete cascade,

  -- The transition itself
  from_status     regwatch.obligation_review_status,  -- null on the create row
  to_status       regwatch.obligation_review_status not null,

  -- Actor — set by trigger from auth.uid() when available; server actions
  -- that need to pass an explicit actor write the row themselves before
  -- the UPDATE so the trigger sees no row to add.
  actor_user_id   uuid references auth.users(id) on delete set null,

  -- Optional metadata: rationale on N/A, kick-back notes, sign-off rationale.
  notes           text,
  metadata        jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now()
);

create index obligation_state_history_obligation_idx
  on regwatch.obligation_state_history (obligation_id, created_at desc);
create index obligation_state_history_org_idx
  on regwatch.obligation_state_history (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Trigger function
-- ---------------------------------------------------------------------------
-- AFTER INSERT records the initial state.
-- AFTER UPDATE records the transition when review_status changes.
-- The server action writes the actor by setting a local config var:
--   select set_config('regwatch.actor', auth.uid()::text, true);
-- Falls back to auth.uid() (when called from RLS-policy SSR context).
-- ---------------------------------------------------------------------------
create or replace function regwatch.record_obligation_state_history()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
declare
  actor uuid;
begin
  -- Resolve actor: explicit config var wins, otherwise auth.uid().
  begin
    actor := nullif(current_setting('regwatch.actor', true), '')::uuid;
  exception when others then
    actor := null;
  end;
  if actor is null then
    actor := auth.uid();
  end if;

  if tg_op = 'INSERT' then
    insert into regwatch.obligation_state_history
      (organization_id, obligation_id, from_status, to_status, actor_user_id)
    values (new.organization_id, new.id, null, new.review_status, actor);
    return new;
  end if;

  if tg_op = 'UPDATE' and old.review_status is distinct from new.review_status then
    insert into regwatch.obligation_state_history
      (organization_id, obligation_id, from_status, to_status, actor_user_id,
       notes, metadata)
    values (
      new.organization_id,
      new.id,
      old.review_status,
      new.review_status,
      actor,
      case
        when new.review_status = 'verified' then new.signoff_rationale
        else null
      end,
      jsonb_build_object(
        'severity_at_transition', new.severity,
        'compliance_status_at_transition', new.compliance_status
      )
    );
  end if;
  return new;
end;
$$;

create trigger obligation_state_history_insert
  after insert on regwatch.compliance_obligations
  for each row execute function regwatch.record_obligation_state_history();

create trigger obligation_state_history_update
  after update on regwatch.compliance_obligations
  for each row execute function regwatch.record_obligation_state_history();

-- ---------------------------------------------------------------------------
-- RLS — members can read their org's history; only the trigger writes.
-- ---------------------------------------------------------------------------
alter table regwatch.obligation_state_history enable row level security;

drop policy if exists obligation_state_history_member_read on regwatch.obligation_state_history;
create policy obligation_state_history_member_read on regwatch.obligation_state_history
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Grants — service-role gets ALL (so the trigger inserts succeed);
-- authenticated gets SELECT only (writes happen via trigger).
-- ---------------------------------------------------------------------------
grant select on regwatch.obligation_state_history to authenticated;
grant all    on regwatch.obligation_state_history to service_role;
grant execute on function regwatch.record_obligation_state_history()
  to service_role, authenticated;
