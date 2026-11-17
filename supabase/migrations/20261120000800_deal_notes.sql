-- Notes on a deal, shared by the workspace: free-text notes (details, agent
-- calls, questions) and comparables (similar properties sold or listed nearby).
-- Everyone in the workspace reads, adds and pins; only the author edits or
-- deletes their own.

create table public.deal_note (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  deal_id uuid not null references public.deal (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'comparable')),
  body text check (body is null or length(body) <= 5000),
  link_url text check (link_url is null or (length(link_url) <= 2000 and link_url ~* '^https?://')),
  comp_address text check (comp_address is null or length(trim(comp_address)) between 1 and 200),
  comp_price_pence bigint check (comp_price_pence is null or comp_price_pence between 0 and 100000000000),
  comp_status text check (comp_status is null or comp_status in ('sold', 'listed')),
  comp_date date,
  comp_beds smallint check (comp_beds is null or comp_beds between 0 and 50),
  comp_floor_area_sqm numeric(8, 2) check (comp_floor_area_sqm is null or comp_floor_area_sqm > 0),
  pinned boolean not null default false,
  author_id uuid references public.profile (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_note_content check (
    (kind = 'note' and body is not null and length(trim(body)) > 0)
    or (kind = 'comparable' and comp_address is not null and comp_price_pence is not null and comp_status is not null)
  )
);

create index deal_note_deal_idx on public.deal_note (deal_id, pinned desc, created_at desc);

create trigger deal_note_workspace before insert or update on public.deal_note
  for each row execute function public.child_workspace_matches_deal();
create trigger deal_note_updated_at before update on public.deal_note
  for each row execute function public.set_updated_at();
-- Adding and removing show in the activity feed; edits and pins don't.
create trigger deal_note_activity after insert or delete on public.deal_note
  for each row execute function public.log_activity();

-- Authors own their words; anyone can pin. Column grants keep the shared
-- update to the pin, and the policies keep edits and deletes to the author.
alter table public.deal_note enable row level security;
revoke all on public.deal_note from anon;

create policy "members read notes" on public.deal_note
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members add their own notes" on public.deal_note
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and author_id = (select auth.uid()));
create policy "members update notes" on public.deal_note
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "authors delete their notes" on public.deal_note
  for delete to authenticated
  using (public.is_workspace_member(workspace_id) and author_id = (select auth.uid()));

-- Only the author may change the content; anyone may pin.
create or replace function public.deal_note_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.author_id is distinct from (select auth.uid())
     and (to_jsonb(new) - array['pinned', 'updated_at']) is distinct from (to_jsonb(old) - array['pinned', 'updated_at']) then
    raise exception 'Only the author can edit this note' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger deal_note_guard before update on public.deal_note
  for each row execute function public.deal_note_guard();
