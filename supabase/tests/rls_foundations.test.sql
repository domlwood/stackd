-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Fixtures (as postgres / owner)
insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"display_name":"Blair"}'),
  ('00000000-0000-0000-0000-0000000000ee', 'outsider@test.local', '{}');

insert into public.workspace (id, name) values ('10000000-0000-0000-0000-000000000001', 'Test workspace');
insert into public.workspace_member (workspace_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into public.workspace_settings (workspace_id) values ('10000000-0000-0000-0000-000000000001');

select is(
  (select display_name from public.profile where id = '00000000-0000-0000-0000-00000000000a'),
  'Alex',
  'profile auto-created from auth user metadata'
);

-- Member A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.workspace), 1, 'member sees their workspace');
select is((select count(*)::int from public.profile), 2, 'member sees co-member profiles only');

update public.workspace_settings set stale_after_days = 60
where workspace_id = '10000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.activity_event where field = 'stale_after_days'),
  1,
  'settings update is written to the activity log by trigger'
);
select is(
  (select actor_id from public.activity_event where field = 'stale_after_days'),
  '00000000-0000-0000-0000-00000000000a'::uuid,
  'activity records the acting user'
);

select throws_ok(
  $$ insert into public.activity_event (workspace_id, action, entity_type, entity_id) values ('10000000-0000-0000-0000-000000000001', 'event', 'x', 'y') $$,
  '42501',
  null,
  'clients cannot write activity directly'
);

-- Outsider
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ee","role":"authenticated"}', true);
select is((select count(*)::int from public.workspace), 0, 'non-member sees no workspace');
select is((select count(*)::int from public.activity_event), 0, 'non-member sees no activity');

-- Append-only even for the owner
reset role;
select throws_ok(
  $$ delete from public.activity_event $$,
  'P0001',
  'activity_event is append-only',
  'activity log cannot be deleted'
);

select * from finish();
rollback;
