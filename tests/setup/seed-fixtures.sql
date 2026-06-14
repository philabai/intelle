-- Multi-tenant QA fixtures. Idempotent: wipes prior qa.test users + their orgs,
-- then recreates. Users sign in via GoTrue (bcrypt password below).
-- Password for ALL fixture users: QA-Test-Pass-2026!

-- ---- 0. Clean slate (remove any prior fixture users + cascade) -------------
do $$
declare uids uuid[];
begin
  select array_agg(id) into uids from auth.users where email like '%@qa.test';
  if uids is not null then
    -- remove org memberships first, then orgs they own that have no other members
    delete from regwatch.organization_members where user_id = any(uids);
    delete from regwatch.organizations o
      where not exists (select 1 from regwatch.organization_members m where m.organization_id = o.id);
    delete from auth.identities where user_id = any(uids);
    delete from auth.users where id = any(uids);
  end if;
end $$;

-- ---- 1. Helper to create a sign-in-able user with optional invite metadata --
create or replace function pg_temp.mk_user(p_email text, p_meta jsonb)
returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    p_email, crypt('QA-Test-Pass-2026!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, coalesce(p_meta, '{}'::jsonb), now(), now()
  );
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (p_email, uid, jsonb_build_object('sub', uid::text, 'email', p_email), 'email', now(), now());
  return uid;
end $$;

-- ---- 2. Create the fixture graph -------------------------------------------
do $$
declare
  a1 uuid; a2 uuid; a3 uuid; b1 uuid; xo uuid; no_org uuid;
  org_a uuid; org_b uuid; org_x uuid;
begin
  -- A1: no invite meta -> trigger provisions personal Org A as owner.
  a1 := pg_temp.mk_user('a1-owner@qa.test', '{}'::jsonb);
  select organization_id into org_a from regwatch.organization_members where user_id = a1 limit 1;

  -- A2 / A3: invite meta -> join Org A as admin / member.
  a2 := pg_temp.mk_user('a2-admin@qa.test',
        jsonb_build_object('regwatch_invite_org_id', org_a::text, 'regwatch_invite_role', 'admin'));
  a3 := pg_temp.mk_user('a3-member@qa.test',
        jsonb_build_object('regwatch_invite_org_id', org_a::text, 'regwatch_invite_role', 'member'));

  -- B1: personal Org B owner (the "other tenant").
  b1 := pg_temp.mk_user('b1-owner@qa.test', '{}'::jsonb);
  select organization_id into org_b from regwatch.organization_members where user_id = b1 limit 1;

  -- X: has own org AND is added to Org B too (multi-org edge case, F12).
  xo := pg_temp.mk_user('x-crossorg@qa.test', '{}'::jsonb);
  select organization_id into org_x from regwatch.organization_members where user_id = xo limit 1;
  insert into regwatch.organization_members (organization_id, user_id, role)
  values (org_b, xo, 'member') on conflict do nothing;

  -- N: no org at all (membership + auto-org removed).
  no_org := pg_temp.mk_user('n-noorg@qa.test', '{}'::jsonb);
  delete from regwatch.organization_members where user_id = no_org;
  delete from regwatch.organizations o
   where not exists (select 1 from regwatch.organization_members m where m.organization_id = o.id);

  -- ---- 3. Distinct per-org data for isolation probes ----------------------
  -- Org A asset + Org B asset (level 2 site).
  insert into regwatch.assets (organization_id, parent_id, level, name, code, asset_type, jurisdiction_code)
  values (org_a, null, 2, 'ORG-A Refinery Alpha', 'A-SITE-1', 'site', 'US'),
         (org_b, null, 2, 'ORG-B Platform Bravo', 'B-SITE-1', 'site', 'GB');

  -- Org A internal document + Org B internal document (org-private).
  insert into regwatch.internal_documents (organization_id, title, internal_code, doc_kind, version, status, owner_user_id)
  values (org_a, 'ORG-A Confidential SOP', 'A-SOP-001', 'sop', '1.0', 'draft', a1),
         (org_b, 'ORG-B Confidential SOP', 'B-SOP-001', 'sop', '1.0', 'draft', b1);

  raise notice 'Seeded: org_a=% org_b=% org_x=%', org_a, org_b, org_x;
end $$;

-- ---- 4. Report what we built -----------------------------------------------
select u.email,
       coalesce(string_agg(o.name || ' [' || m.role || ']', ', '), '(no org)') as orgs
from auth.users u
left join regwatch.organization_members m on m.user_id = u.id
left join regwatch.organizations o on o.id = m.organization_id
where u.email like '%@qa.test'
group by u.email order by u.email;
