-- ============================================================================
-- RegWatch — Web Push subscriptions
--
-- Stores browser push subscription records for users who opted into web push
-- in Phase 1.7. One row per (user, browser) — a user can have multiple
-- subscriptions if they install RegWatch on phone + laptop. Endpoints are
-- unique globally (the browser's push service issues them).
--
-- RLS: each row is owned by the user_id; only that user sees / mutates it.
-- The push pipeline reads via service-role to fan out notifications.
-- ============================================================================

create table if not exists regwatch.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references regwatch.organizations(id) on delete cascade,
  endpoint        text not null unique,
  p256dh          text not null,
  auth            text not null,
  user_agent      text,
  created_at      timestamptz not null default now(),
  last_used_at    timestamptz
);

create index if not exists push_subscriptions_user_idx
  on regwatch.push_subscriptions (user_id);
create index if not exists push_subscriptions_org_idx
  on regwatch.push_subscriptions (organization_id);

alter table regwatch.push_subscriptions enable row level security;

create policy push_subs_self_read
  on regwatch.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy push_subs_self_insert
  on regwatch.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid() and regwatch.is_org_member(organization_id));

create policy push_subs_self_delete
  on regwatch.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on regwatch.push_subscriptions to authenticated;
grant all on regwatch.push_subscriptions to service_role;

-- ===========================================================================
-- End of 20260607_regwatch_push_subscriptions.sql
-- ===========================================================================
