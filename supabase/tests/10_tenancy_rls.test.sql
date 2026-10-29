-- Phase 1 — RLS & role permission proofs for the tenancy schema.
--
-- Proves: RLS is enabled on every tenancy table; a member of farm A can
-- neither read nor write farm B's rows; and each role gets exactly the
-- permissions the matrix grants. Fixtures live inside this transaction and
-- are rolled back at the end, so the test is self-contained.
--
-- Authenticated users are simulated with `set local role authenticated` plus
-- a `request.jwt.claims` JSON carrying the user's `sub` (auth.uid reads it).

begin;
create extension if not exists pgtap;

select plan(18);

-- ---------------------------------------------------------------------------
-- Fixtures (created as the superuser test role; RLS does not apply here).
--   Farm A: ownerA (owner), workerA (worker).
--   Farm B: ownerB (owner).
-- Inserting into auth.users fires handle_new_user(), creating profiles.
-- ---------------------------------------------------------------------------
insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a1', 'authenticated', 'authenticated', 'owner-a@test.local'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000a2', 'authenticated', 'authenticated', 'worker-a@test.local'),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-0000000000b1', 'authenticated', 'authenticated', 'owner-b@test.local');

insert into public.farms (id, name, slug, created_by, updated_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Farm A', 'farm-a', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Farm B', 'farm-b', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1');

insert into public.farm_members (farm_id, user_id, role, status, created_by, updated_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-0000000000a1', 'owner',  'active', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-0000000000a2', 'worker', 'active', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-0000000000b1', 'owner',  'active', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1');

insert into public.farm_settings (farm_id, created_by, updated_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1');

-- ---------------------------------------------------------------------------
-- 1-6: RLS is enabled on every tenancy table.
-- ---------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),      'RLS enabled: profiles');
select ok((select relrowsecurity from pg_class where oid = 'public.farms'::regclass),         'RLS enabled: farms');
select ok((select relrowsecurity from pg_class where oid = 'public.farm_members'::regclass),  'RLS enabled: farm_members');
select ok((select relrowsecurity from pg_class where oid = 'public.invitations'::regclass),   'RLS enabled: invitations');
select ok((select relrowsecurity from pg_class where oid = 'public.farm_settings'::regclass), 'RLS enabled: farm_settings');
select ok((select relrowsecurity from pg_class where oid = 'public.audit_log'::regclass),     'RLS enabled: audit_log');

-- ---------------------------------------------------------------------------
-- Act as ownerA.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- 7-8: membership helper functions.
select ok(public.is_farm_member('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),      'is_farm_member: ownerA is a member of farm A');
select ok(not public.is_farm_member('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),  'is_farm_member: ownerA is NOT a member of farm B');

-- 9-10: tenant isolation on reads.
select is((select count(*)::int from public.farms), 1, 'ownerA sees exactly one farm (A)');
select is((select count(*)::int from public.farm_members where farm_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0, 'ownerA cannot read farm B members');

-- 11-12: profile visibility is limited to co-members.
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'), 1, 'ownerA can see co-member workerA profile');
select is((select count(*)::int from public.profiles where id = '00000000-0000-0000-0000-0000000000b1'), 0, 'ownerA cannot see ownerB profile');

-- 13: owner can create an invitation in their own farm.
select lives_ok(
  $$ insert into public.invitations (farm_id, email, role, created_by, updated_by)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'invitee@test.local', 'manager',
             '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1') $$,
  'owner can invite a member to their own farm'
);

-- 15 (checked while still ownerA): cross-tenant write is blocked by RLS.
select throws_ok(
  $$ insert into public.invitations (farm_id, email, role, created_by, updated_by)
     values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'evil@test.local', 'owner',
             '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1') $$,
  '42501',
  NULL,
  'ownerA cannot create an invitation in farm B'
);

-- 17: owner can update their farm settings (one row affected).
with u as (
  update public.farm_settings set overdue_days = 45
   where farm_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning 1
)
select is((select count(*)::int from u), 1, 'owner can update farm A settings');

-- ---------------------------------------------------------------------------
-- Act as workerA.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}';

-- 14: worker cannot create invitations.
select throws_ok(
  $$ insert into public.invitations (farm_id, email, role, created_by, updated_by)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'nope@test.local', 'worker',
             '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2') $$,
  '42501',
  NULL,
  'worker cannot create an invitation'
);

-- 16: worker's update of farm settings is filtered out (affects no rows).
with u as (
  update public.farm_settings set overdue_days = 99
   where farm_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' returning 1
)
select is((select count(*)::int from u), 0, 'worker cannot update farm settings (RLS filters the row)');

-- ---------------------------------------------------------------------------
-- Act as ownerB.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

-- 18: ownerB sees only farm B.
select is((select count(*)::int from public.farms), 1, 'ownerB sees exactly one farm (B)');

reset role;
select * from finish();
rollback;
