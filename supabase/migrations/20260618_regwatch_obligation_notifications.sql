-- ===========================================================================
-- RegWatch — Obligation notification queue + change-detection triggers
-- ---------------------------------------------------------------------------
-- Closes the inward-facing notification loop:
--   1. Reviewer is notified when an obligation is assigned to them.
--   2. Reviewer is notified when the regulation behind their open obligation
--      changes (regulatory_items.last_changed_at advances).
--   3. Internal-document owner is notified when any linked regulation
--      changes — AND the active link row is automatically marked
--      superseded + a fresh link row is inserted against the new version
--      (Veeva-style version pinning enforced server-side, not just at
--      link-create time).
--   4. Admins are notified when an obligation moves to pending-approval.
--   5. The original reviewer is notified when their submission is signed
--      off (or kicked back).
--
-- Implementation: BEFORE/AFTER triggers ENQUEUE rows; the
-- regwatch-notify-obligations cron drains them and fans out via Brevo +
-- Web Push, sharing the existing alert_deliveries idempotency log.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enum + queue table
-- ---------------------------------------------------------------------------
create type regwatch.obligation_notification_kind as enum (
  'obligation_assigned',
  'regulation_changed_for_obligation',
  'regulation_changed_for_doc',
  'obligation_pending_approval',
  'obligation_signed_off',
  'obligation_kicked_back'
);

create table regwatch.obligation_notification_queue (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references regwatch.organizations(id) on delete cascade,
  recipient_user_id   uuid not null references auth.users(id) on delete cascade,
  kind                regwatch.obligation_notification_kind not null,

  -- Subjects of the notification — all nullable; the cron picks the
  -- right set per kind. The cron joins to the fresh row at send time so
  -- we don't store denormalised state that can go stale.
  obligation_id           uuid references regwatch.compliance_obligations(id) on delete cascade,
  regulatory_item_id      uuid references regwatch.regulatory_items(id) on delete cascade,
  internal_document_id    uuid references regwatch.internal_documents(id) on delete cascade,

  -- Free-form payload (kick-back notes, prior version hash, etc.).
  payload                 jsonb not null default '{}'::jsonb,

  enqueued_at             timestamptz not null default now(),
  sent_at                 timestamptz,
  failed_at               timestamptz,
  fail_count              int not null default 0,
  last_error              text
);

create index obligation_notif_queue_pending_idx
  on regwatch.obligation_notification_queue (enqueued_at)
  where sent_at is null and (failed_at is null or fail_count < 5);

create index obligation_notif_queue_org_idx
  on regwatch.obligation_notification_queue (organization_id, enqueued_at desc);

-- ---------------------------------------------------------------------------
-- RLS — members read their org's queue (helps the dashboard later); cron
-- + service-role writes.
-- ---------------------------------------------------------------------------
alter table regwatch.obligation_notification_queue enable row level security;

drop policy if exists obligation_notif_queue_member_read on regwatch.obligation_notification_queue;
create policy obligation_notif_queue_member_read on regwatch.obligation_notification_queue
  for select to authenticated
  using (regwatch.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Grants — explicit per the new-table-grant rule.
-- ---------------------------------------------------------------------------
grant select on regwatch.obligation_notification_queue to authenticated;
grant all    on regwatch.obligation_notification_queue to service_role;

-- ===========================================================================
-- Trigger 1: regulation change → fan out
-- ---------------------------------------------------------------------------
-- AFTER UPDATE on regulatory_items: when last_changed_at advances, find
-- every open obligation that pins this regulation and every active
-- internal-document link, and ENQUEUE one notification row per recipient.
-- The doc-link side ALSO supersedes the active row + inserts a fresh link
-- against the new last_changed_at version stamp so the version-pin
-- contract is enforced even when the original linker isn't around.
-- ===========================================================================
create or replace function regwatch.handle_regulation_change()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
declare
  new_version text;
begin
  -- Only act when the last_changed_at moved forward.
  if new.last_changed_at is not distinct from old.last_changed_at then
    return new;
  end if;

  new_version := new.last_changed_at::text;

  -- (a) Reviewer notifications for every open obligation pinned to this reg.
  insert into regwatch.obligation_notification_queue
    (organization_id, recipient_user_id, kind, obligation_id, regulatory_item_id, payload)
  select
    o.organization_id,
    o.assigned_reviewer_user_id,
    'regulation_changed_for_obligation',
    o.id,
    new.id,
    jsonb_build_object('new_version', new_version)
  from regwatch.compliance_obligations o
  where o.regulatory_item_id = new.id
    and o.assigned_reviewer_user_id is not null
    and o.review_status not in ('verified', 'closed', 'not-applicable');

  -- (b) Doc-owner notifications — one per linked, not-yet-superseded link.
  insert into regwatch.obligation_notification_queue
    (organization_id, recipient_user_id, kind, internal_document_id,
     regulatory_item_id, payload)
  select
    l.organization_id,
    d.owner_user_id,
    'regulation_changed_for_doc',
    l.internal_document_id,
    new.id,
    jsonb_build_object(
      'prev_version', l.linked_at_item_version,
      'new_version',  new_version
    )
  from regwatch.internal_document_regulation_links l
  join regwatch.internal_documents d on d.id = l.internal_document_id
  where l.regulatory_item_id = new.id
    and l.superseded_at is null
    and d.owner_user_id is not null;

  -- (c) Auto-supersede active link rows + insert fresh ones against the
  -- new version stamp. Loop because we need each row's prior values to
  -- build the replacement.
  insert into regwatch.internal_document_regulation_links
    (organization_id, internal_document_id, regulatory_item_id, clause_anchor,
     link_rationale, linked_at_item_version, created_by)
  select
    l.organization_id,
    l.internal_document_id,
    l.regulatory_item_id,
    l.clause_anchor,
    l.link_rationale,
    new_version,
    l.created_by
  from regwatch.internal_document_regulation_links l
  where l.regulatory_item_id = new.id
    and l.superseded_at is null;

  update regwatch.internal_document_regulation_links
     set superseded_at = now()
   where regulatory_item_id = new.id
     and superseded_at is null
     and linked_at_item_version is distinct from new_version;

  return new;
end;
$$;

drop trigger if exists regulatory_items_notify_on_change on regwatch.regulatory_items;
create trigger regulatory_items_notify_on_change
  after update on regwatch.regulatory_items
  for each row execute function regwatch.handle_regulation_change();

-- ===========================================================================
-- Trigger 2: obligation state change → fan out
-- ---------------------------------------------------------------------------
-- AFTER UPDATE on compliance_obligations:
--   - on assignment (assigned_reviewer_user_id set): notify the reviewer.
--   - state → pending-approval: notify every org admin.
--   - state → verified: notify the reviewer (+ doc owners on linked docs).
--   - state → in-review FROM pending-approval (admin kick-back): notify reviewer.
-- ===========================================================================
create or replace function regwatch.handle_obligation_change()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
begin
  -- Newly assigned reviewer (existing row had no assignee or a different one).
  if new.assigned_reviewer_user_id is not null
     and (
       old.assigned_reviewer_user_id is null
       or old.assigned_reviewer_user_id is distinct from new.assigned_reviewer_user_id
     )
  then
    insert into regwatch.obligation_notification_queue
      (organization_id, recipient_user_id, kind, obligation_id,
       regulatory_item_id, payload)
    values (
      new.organization_id,
      new.assigned_reviewer_user_id,
      'obligation_assigned',
      new.id,
      new.regulatory_item_id,
      '{}'::jsonb
    );
  end if;

  -- State transition fan-out.
  if old.review_status is distinct from new.review_status then
    -- pending-approval → notify every owner+admin of the org.
    if new.review_status = 'pending-approval' then
      insert into regwatch.obligation_notification_queue
        (organization_id, recipient_user_id, kind, obligation_id,
         regulatory_item_id, payload)
      select
        new.organization_id,
        m.user_id,
        'obligation_pending_approval',
        new.id,
        new.regulatory_item_id,
        jsonb_build_object(
          'severity', new.severity::text,
          'compliance_status', new.compliance_status::text
        )
      from regwatch.organization_members m
      where m.organization_id = new.organization_id
        and m.role in ('owner', 'admin');
    end if;

    -- Verified → notify the assigned reviewer.
    if new.review_status = 'verified'
       and new.assigned_reviewer_user_id is not null
    then
      insert into regwatch.obligation_notification_queue
        (organization_id, recipient_user_id, kind, obligation_id,
         regulatory_item_id, payload)
      values (
        new.organization_id,
        new.assigned_reviewer_user_id,
        'obligation_signed_off',
        new.id,
        new.regulatory_item_id,
        jsonb_build_object('rationale', new.signoff_rationale)
      );
    end if;

    -- Kick-back from pending-approval back to in-review → notify reviewer.
    if old.review_status = 'pending-approval'
       and new.review_status = 'in-review'
       and new.assigned_reviewer_user_id is not null
    then
      insert into regwatch.obligation_notification_queue
        (organization_id, recipient_user_id, kind, obligation_id,
         regulatory_item_id, payload)
      values (
        new.organization_id,
        new.assigned_reviewer_user_id,
        'obligation_kicked_back',
        new.id,
        new.regulatory_item_id,
        coalesce(new.review_notes -> 'kickback_notes', '{}'::jsonb)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists compliance_obligations_notify_on_change on regwatch.compliance_obligations;
create trigger compliance_obligations_notify_on_change
  after update on regwatch.compliance_obligations
  for each row execute function regwatch.handle_obligation_change();

-- ===========================================================================
-- Trigger 3: on insert, notify the initial assignee (if any).
-- ===========================================================================
create or replace function regwatch.handle_obligation_insert_notify()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
begin
  if new.assigned_reviewer_user_id is not null then
    insert into regwatch.obligation_notification_queue
      (organization_id, recipient_user_id, kind, obligation_id,
       regulatory_item_id, payload)
    values (
      new.organization_id,
      new.assigned_reviewer_user_id,
      'obligation_assigned',
      new.id,
      new.regulatory_item_id,
      '{}'::jsonb
    );
  end if;
  return new;
end;
$$;

drop trigger if exists compliance_obligations_notify_on_insert on regwatch.compliance_obligations;
create trigger compliance_obligations_notify_on_insert
  after insert on regwatch.compliance_obligations
  for each row execute function regwatch.handle_obligation_insert_notify();

-- ---------------------------------------------------------------------------
-- Grants on the trigger functions
-- ---------------------------------------------------------------------------
grant execute on function regwatch.handle_regulation_change()           to service_role;
grant execute on function regwatch.handle_obligation_change()           to service_role;
grant execute on function regwatch.handle_obligation_insert_notify()    to service_role;
