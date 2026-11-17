-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', '{"display_name":"Alex"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', '{"display_name":"Blair"}'),
  ('00000000-0000-0000-0000-0000000000ee', 'outsider@test.local', '{}');
insert into public.workspace (id, name) values ('10000000-0000-0000-0000-000000000001', 'W');
insert into public.workspace_member (workspace_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b');

set local role authenticated;

-- Alex creates a deal and opens it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
insert into public.deal (id, workspace_id, address_line, postcode, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '1 Test St', 'AB1 2CD', 'active');
insert into public.deal_view (deal_id, user_id, workspace_id, viewed_at)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', now());
select is((select count(*)::int from public.deal_unread()), 0, 'your own changes are never unread');
select throws_ok($$
  insert into public.deal_view (deal_id, user_id, workspace_id)
  values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001')
$$, '42501', null, 'you can only record your own visits');

-- Blair hasn't opened it: Alex creating it is new to Blair.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select unread from public.deal_unread()), 1, 'a partner''s new deal is unread until you open it');
select is((select count(*)::int from public.deal_view where user_id = '00000000-0000-0000-0000-00000000000a' and viewed_at is not null), 1, 'you can see when your partner looked');
insert into public.deal_view (deal_id, user_id, workspace_id)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.deal_unread()), 0, 'opening the deal marks it read');

-- Alex changes something afterwards (a minute later): new to Blair again.
reset role;
insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, field, created_at)
values ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a',
  'update', 'deal', '20000000-0000-0000-0000-000000000001', 'address_line', now() + interval '1 minute');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select unread from public.deal_unread()), 1, 'a partner''s later change is unread');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ee","role":"authenticated"}', true);
select is((select count(*)::int from public.deal_view), 0, 'outsiders see no visits');

select * from finish();
rollback;
