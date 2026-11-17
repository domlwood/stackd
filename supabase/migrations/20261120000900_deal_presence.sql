-- Who has looked at what, and when. Powers "Alex viewed 2h ago", the unread
-- dot on deal cards and the Today feed ("new since you last looked").

create table public.deal_view (
  deal_id uuid not null references public.deal (id) on delete cascade,
  user_id uuid not null references public.profile (id) on delete cascade,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  -- Read marker: changes after this are "new" to you.
  last_seen_at timestamptz not null default now(),
  -- When you actually last opened it (null until you do). Shown by name.
  viewed_at timestamptz,
  primary key (deal_id, user_id)
);

create index deal_view_workspace_idx on public.deal_view (workspace_id, viewed_at desc);

create trigger deal_view_workspace before insert or update on public.deal_view
  for each row execute function public.child_workspace_matches_deal();

alter table public.deal_view enable row level security;
revoke all on public.deal_view from anon;

-- Everyone sees who has looked; each person records only their own visits.
create policy "members read views" on public.deal_view
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members record their own views" on public.deal_view
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and user_id = (select auth.uid()));
create policy "members update their own views" on public.deal_view
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (public.is_workspace_member(workspace_id) and user_id = (select auth.uid()));

-- Start everyone caught up, so existing history doesn't all show as new.
-- viewed_at stays null: nobody has really opened anything yet.
insert into public.deal_view (deal_id, user_id, workspace_id, last_seen_at)
select d.id, m.user_id, d.workspace_id, now()
from public.deal d
join public.workspace_member m on m.workspace_id = d.workspace_id
on conflict do nothing;

-- Per deal: how many changes other people made since you last opened it,
-- and who made the latest.
-- Runs as the caller, so RLS limits it to their workspace.
create or replace function public.deal_unread()
returns table (deal_id uuid, unread integer, last_activity_at timestamptz, last_actor_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    d.id,
    count(a.id)::integer,
    max(a.created_at),
    (array_agg(a.actor_id order by a.created_at desc))[1]
  from public.deal d
  left join public.deal_view v
    on v.deal_id = d.id and v.user_id = (select auth.uid())
  join public.activity_event a
    on a.deal_id = d.id
   and a.actor_id is not null
   and a.actor_id <> (select auth.uid())
   and a.created_at > coalesce(v.last_seen_at, '-infinity'::timestamptz)
  group by d.id
$$;

revoke all on function public.deal_unread() from public, anon;
grant execute on function public.deal_unread() to authenticated;
