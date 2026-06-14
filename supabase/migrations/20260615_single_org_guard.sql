-- F12 — enforce single-org membership.
-- The app is built around one org per user (getMyOrganization() takes the first
-- membership). Prevent a user from silently ending up in two orgs, which would
-- make which-org-you-see nondeterministic. App layer already rejects this
-- (members-actions.addMemberByEmail); this trigger is the defence-in-depth guard
-- so it holds even for direct/SQL inserts. APPLY in the Supabase SQL editor.

create or replace function regwatch.enforce_single_org()
returns trigger
language plpgsql
security definer
set search_path = regwatch
as $$
begin
  if exists (
    select 1 from regwatch.organization_members m
    where m.user_id = new.user_id
      and m.organization_id <> new.organization_id
  ) then
    raise exception
      'single-org policy: user % already belongs to another organization', new.user_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_org_trg on regwatch.organization_members;
create trigger enforce_single_org_trg
  before insert on regwatch.organization_members
  for each row execute function regwatch.enforce_single_org();
