-- ===========================================================================
-- RegWatch — Pending invites + invite-aware signup trigger
-- ---------------------------------------------------------------------------
-- Adds a `regwatch.pending_invites` table so admins can invite a non-existent
-- user to their org. The Supabase admin API sends the signup-link email; on
-- first signup, the auth trigger reads `raw_user_meta_data.regwatch_invite_*`
-- and joins the new user to the inviting org with the specified role INSTEAD
-- of creating a new personal org.
--
-- Why we still need a `pending_invites` row even though the metadata-on-user
-- pattern is self-contained:
--   1. Admin UI needs to show pending invites (email + role + invited_by)
--      until they accept.
--   2. We want to gate against re-inviting the same email twice and to allow
--      revocation.
--   3. The trigger marks the matching row as accepted_at = now() on signup.
-- ===========================================================================

create table if not exists regwatch.pending_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references regwatch.organizations(id) on delete cascade,
  email           text not null,
  role            text not null check (role in ('admin', 'member')),
  invited_by      uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  revoked_at      timestamptz
);

-- One active invite per (org, lowercased email) — partial unique on not-yet-resolved rows.
create unique index if not exists pending_invites_active_uq
  on regwatch.pending_invites (organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

create index if not exists pending_invites_email_idx
  on regwatch.pending_invites (lower(email))
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- RLS — only org members can see invites for their org; only admins can write
-- ---------------------------------------------------------------------------
alter table regwatch.pending_invites enable row level security;

drop policy if exists pending_invites_select on regwatch.pending_invites;
create policy pending_invites_select on regwatch.pending_invites
  for select to authenticated
  using (
    organization_id in (
      select organization_id from regwatch.organization_members
      where user_id = auth.uid()
    )
  );

drop policy if exists pending_invites_insert on regwatch.pending_invites;
create policy pending_invites_insert on regwatch.pending_invites
  for insert to authenticated
  with check (
    organization_id in (
      select organization_id from regwatch.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

drop policy if exists pending_invites_update on regwatch.pending_invites;
create policy pending_invites_update on regwatch.pending_invites
  for update to authenticated
  using (
    organization_id in (
      select organization_id from regwatch.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  )
  with check (
    organization_id in (
      select organization_id from regwatch.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

drop policy if exists pending_invites_delete on regwatch.pending_invites;
create policy pending_invites_delete on regwatch.pending_invites
  for delete to authenticated
  using (
    organization_id in (
      select organization_id from regwatch.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- ===========================================================================
-- Update the signup trigger to honour invites
-- ===========================================================================
create or replace function regwatch.handle_new_user_provisioning()
returns trigger
language plpgsql
security definer
set search_path = regwatch, public
as $$
declare
  new_org_id        uuid;
  base_slug         text;
  final_slug        text;
  attempt           int := 0;
  invite_org_id     uuid;
  invite_role       text;
begin
  -- If this user came in via an admin-issued Supabase invite, the
  -- `raw_user_meta_data` payload carries our two markers. Honour them and
  -- skip personal-org auto-create.
  invite_org_id := nullif(new.raw_user_meta_data ->> 'regwatch_invite_org_id', '')::uuid;
  invite_role   := nullif(new.raw_user_meta_data ->> 'regwatch_invite_role', '');

  if invite_org_id is not null then
    -- Verify the org still exists; if not, fall through to personal-org path.
    if exists (select 1 from regwatch.organizations where id = invite_org_id) then
      insert into regwatch.organization_members (organization_id, user_id, role)
      values (invite_org_id, new.id, coalesce(invite_role, 'member'))
      on conflict do nothing;

      -- Mark the matching pending_invite row(s) accepted.
      update regwatch.pending_invites
         set accepted_at = now()
       where organization_id = invite_org_id
         and lower(email) = lower(new.email)
         and accepted_at is null
         and revoked_at is null;

      return new;
    end if;
  end if;

  -- ---- Default flow: provision a personal org + owner membership ----------
  base_slug := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9]+', '-', 'g'));
  if base_slug is null or length(base_slug) = 0 then
    base_slug := 'org';
  end if;
  final_slug := base_slug;

  while exists (select 1 from regwatch.organizations where slug = final_slug) and attempt < 50 loop
    attempt := attempt + 1;
    final_slug := base_slug || '-' || attempt::text;
  end loop;

  insert into regwatch.organizations (slug, name, tier)
  values (final_slug, coalesce(new.raw_user_meta_data ->> 'org_name', initcap(replace(base_slug, '-', ' '))), 'free')
  returning id into new_org_id;

  insert into regwatch.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  insert into regwatch.operations_footprints (organization_id, name, is_configured)
  values (new_org_id, 'Default footprint', false);

  return new;
end;
$$;

grant execute on function regwatch.handle_new_user_provisioning() to service_role;

-- Trigger itself is unchanged — drop/recreate to ensure latest function binding.
drop trigger if exists on_auth_user_created_regwatch on auth.users;
create trigger on_auth_user_created_regwatch
  after insert on auth.users
  for each row execute function regwatch.handle_new_user_provisioning();
