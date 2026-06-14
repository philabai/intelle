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
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    -- GoTrue scans these as strings; NULL => "Database error querying schema" on sign-in.
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
    p_email, crypt('QA-Test-Pass-2026!', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, coalesce(p_meta, '{}'::jsonb), now(), now(),
    '', '', '', '', '', '', '', ''
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

  -- X: a normal single-org owner (Org X). Post-F12, a user can belong to only
  -- one org — the cross-org join is now blocked by the enforce_single_org
  -- trigger and is asserted as denied in the RLS probe instead of seeded.
  xo := pg_temp.mk_user('x-crossorg@qa.test', '{}'::jsonb);
  select organization_id into org_x from regwatch.organization_members where user_id = xo limit 1;

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

  -- Org A internal document + Org B internal document (org-private), each with a
  -- committed current revision (realistic — the app never leaves a doc revision-less).
  declare doc_a uuid; doc_b uuid; rev_a uuid; rev_b uuid;
  begin
    insert into regwatch.internal_documents (organization_id, title, internal_code, doc_kind, version, status, owner_user_id)
    values (org_a, 'ORG-A Confidential SOP', 'A-SOP-001', 'sop', '1.0', 'draft', a1) returning id into doc_a;
    insert into regwatch.internal_documents (organization_id, title, internal_code, doc_kind, version, status, owner_user_id)
    values (org_b, 'ORG-B Confidential SOP', 'B-SOP-001', 'sop', '1.0', 'draft', b1) returning id into doc_b;

    insert into regwatch.internal_document_revisions
      (organization_id, internal_document_id, revision_number, revision_type, version_major, version_minor,
       version_bump, body_doc, body_text, reason_for_change, is_committed, created_by)
    values (org_a, doc_a, 1, 'editor', 1, 0, 'minor',
       '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"ORG-A confidential body text — methane LDAR procedure."}]}]}'::jsonb,
       'ORG-A confidential body text — methane LDAR procedure.', 'initial', true, a1)
      returning id into rev_a;
    insert into regwatch.internal_document_revisions
      (organization_id, internal_document_id, revision_number, revision_type, version_major, version_minor,
       version_bump, body_doc, body_text, reason_for_change, is_committed, created_by)
    values (org_b, doc_b, 1, 'editor', 1, 0, 'minor',
       '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"ORG-B confidential body text — platform safety case."}]}]}'::jsonb,
       'ORG-B confidential body text — platform safety case.', 'initial', true, b1)
      returning id into rev_b;

    update regwatch.internal_documents set current_revision_id = rev_a where id = doc_a;
    update regwatch.internal_documents set current_revision_id = rev_b where id = doc_b;
  end;

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
