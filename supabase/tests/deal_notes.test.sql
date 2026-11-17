-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"display_name":"Blair"}'),
  ('00000000-0000-0000-0000-0000000000ee', 'outsider@test.local', '{}');
insert into public.workspace (id, name) values ('10000000-0000-0000-0000-000000000001', 'W');
insert into public.workspace_member (workspace_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');
insert into public.deal (id, workspace_id, address_line, postcode, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '1 Test St', 'AB1 2CD', 'active');

set local role authenticated;

-- Alex adds a note and a comparable.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select lives_ok($$
  insert into public.deal_note (id, workspace_id, deal_id, kind, body)
  values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'note', 'Agent says vendor wants a quick sale')
$$, 'a member adds a note');
select lives_ok($$
  insert into public.deal_note (workspace_id, deal_id, kind, comp_address, comp_price_pence, comp_status)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'comparable', '3 Test St', 21000000, 'sold')
$$, 'a member adds a comparable');
select throws_ok($$
  insert into public.deal_note (workspace_id, deal_id, kind, comp_address)
  values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'comparable', '5 Test St')
$$, '23514', null, 'a comparable needs a price and whether it sold');
select is(
  (select count(*)::int from public.activity_event where entity_type = 'deal_note' and action = 'create'),
  2, 'adding notes shows in the activity feed');

-- Blair can read and pin Alex's note, but not edit or delete it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.deal_note), 2, 'the other member reads the notes');
update public.deal_note set pinned = true where id = '30000000-0000-0000-0000-000000000001';
select is((select pinned from public.deal_note where id = '30000000-0000-0000-0000-000000000001'), true, 'anyone can pin');
select throws_ok($$
  update public.deal_note set body = 'changed' where id = '30000000-0000-0000-0000-000000000001'
$$, '42501', null, 'only the author edits a note');
delete from public.deal_note where id = '30000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.deal_note where id = '30000000-0000-0000-0000-000000000001'), 1, 'only the author deletes a note');

-- Outsiders see nothing.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ee","role":"authenticated"}', true);
select is((select count(*)::int from public.deal_note), 0, 'outsiders read no notes');

select * from finish();
rollback;
