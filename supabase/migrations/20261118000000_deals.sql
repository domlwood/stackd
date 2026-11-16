-- Deals, sourced inputs (Agreed + per-user proposals), refurb lines, analysis cache.

create table public.deal (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  status text not null default 'lead' check (status in ('lead', 'analysing', 'viewing', 'offer', 'accepted', 'passed')),
  passed_reason text,
  status_changed_at timestamptz not null default now(),
  address_line text not null check (length(trim(address_line)) between 1 and 200),
  postcode text check (postcode is null or length(postcode) <= 10),
  lat double precision,
  lng double precision,
  property_type text check (property_type is null or property_type in ('detached', 'semi_detached', 'terraced', 'flat', 'bungalow', 'other')),
  tenure text check (tenure is null or tenure in ('freehold', 'leasehold', 'share_of_freehold', 'unknown')),
  beds smallint check (beds is null or beds between 0 and 30),
  baths smallint check (baths is null or baths between 0 and 30),
  floor_area_sqm numeric(8, 2) check (floor_area_sqm is null or floor_area_sqm > 0),
  asking_price_pence bigint check (asking_price_pence is null or asking_price_pence >= 0),
  listing_url text,
  listing_provider_id text,
  agent text,
  listed_at date,
  description text,
  key_features text[] not null default '{}',
  cover_photo_url text,
  comp_search jsonb not null default '{}'::jsonb,
  created_by uuid references public.profile (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint passed_needs_reason check (status <> 'passed' or length(trim(coalesce(passed_reason, ''))) > 0)
);

create index deal_workspace_status_idx on public.deal (workspace_id, status);

create or replace function public.deal_status_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at := now();
    if new.status <> 'passed' then
      new.passed_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger deal_status_changed before update on public.deal
  for each row execute function public.deal_status_changed();

-- Every input is a sourced, owned value. Agreed rows have user_id null;
-- proposals belong to one user. Values are jsonb validated by the app's input registry.
create table public.deal_input (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  deal_id uuid not null references public.deal (id) on delete cascade,
  key text not null check (length(key) between 1 and 120),
  scope text not null check (scope in ('agreed', 'proposal')),
  user_id uuid references public.profile (id) on delete cascade,
  value jsonb not null,
  source_text text check (source_text is null or length(source_text) <= 500),
  source_url text check (source_url is null or length(source_url) <= 2000),
  note text check (note is null or length(note) <= 2000),
  set_by uuid references public.profile (id) on delete set null default auth.uid(),
  set_at timestamptz not null default now(),
  constraint input_scope_owner check ((scope = 'agreed') = (user_id is null)),
  constraint deal_input_unique unique nulls not distinct (deal_id, key, scope, user_id)
);

create index deal_input_deal_idx on public.deal_input (deal_id);

create or replace function public.deal_input_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.set_at := now();
  new.set_by := coalesce((select auth.uid()), new.set_by);
  return new;
end;
$$;

create trigger deal_input_touch before update on public.deal_input
  for each row execute function public.deal_input_touch();

-- Input changes are logged with the input key as the field, so the activity
-- feed reads "Exit value: £300,000 → £310,000" rather than a generic jsonb diff.
create or replace function public.log_deal_input_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.deal_input := coalesce(new, old);
  v_entity text := case when r.scope = 'agreed' then 'deal_input' else 'deal_proposal' end;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, field, new_value)
    values (r.workspace_id, r.deal_id, (select auth.uid()), 'create', v_entity, r.id::text, r.key,
      jsonb_build_object('value', new.value, 'source', new.source_text, 'url', new.source_url, 'note', new.note, 'user_id', new.user_id));
  elsif tg_op = 'DELETE' then
    insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, field, old_value)
    values (r.workspace_id, r.deal_id, (select auth.uid()), 'delete', v_entity, r.id::text, r.key,
      jsonb_build_object('value', old.value, 'user_id', old.user_id));
  elsif (old.value, old.source_text, old.source_url, old.note) is distinct from (new.value, new.source_text, new.source_url, new.note) then
    insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, field, old_value, new_value)
    values (r.workspace_id, r.deal_id, (select auth.uid()), 'update', v_entity, r.id::text, r.key,
      jsonb_build_object('value', old.value, 'source', old.source_text, 'url', old.source_url, 'note', old.note, 'user_id', old.user_id),
      jsonb_build_object('value', new.value, 'source', new.source_text, 'url', new.source_url, 'note', new.note, 'user_id', new.user_id));
  end if;
  return null;
end;
$$;

create trigger deal_input_activity after insert or update or delete on public.deal_input
  for each row execute function public.log_deal_input_activity();

create table public.refurb_item (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  deal_id uuid not null references public.deal (id) on delete cascade,
  category text not null check (length(trim(category)) between 1 and 60),
  description text check (description is null or length(description) <= 300),
  ordinal integer not null default 0,
  created_by uuid references public.profile (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index refurb_item_deal_idx on public.refurb_item (deal_id, ordinal);

-- Removing a refurb line removes its cost inputs (agreed + proposals).
create or replace function public.refurb_item_cleanup()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.deal_input where deal_id = old.deal_id and key = 'refurb_item:' || old.id::text || '.cost';
  return old;
end;
$$;

create trigger refurb_item_cleanup after delete on public.refurb_item
  for each row execute function public.refurb_item_cleanup();

-- Agreed-view analysis summary for the pipeline and committed cash. Derived data: not audited.
create table public.deal_analysis_cache (
  deal_id uuid primary key references public.deal (id) on delete cascade,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  inputs_hash text not null,
  summary jsonb not null,
  computed_at timestamptz not null default now()
);

-- Child rows must share their deal's workspace.
create or replace function public.child_workspace_matches_deal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from (select d.workspace_id from public.deal d where d.id = new.deal_id) then
    raise exception 'workspace must match the deal' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger deal_input_workspace before insert or update on public.deal_input
  for each row execute function public.child_workspace_matches_deal();
create trigger refurb_item_workspace before insert or update on public.refurb_item
  for each row execute function public.child_workspace_matches_deal();
create trigger deal_analysis_cache_workspace before insert or update on public.deal_analysis_cache
  for each row execute function public.child_workspace_matches_deal();

create trigger deal_updated_at before update on public.deal
  for each row execute function public.set_updated_at();
create trigger refurb_item_updated_at before update on public.refurb_item
  for each row execute function public.set_updated_at();

create trigger deal_activity after insert or update or delete on public.deal
  for each row execute function public.log_activity();
create trigger refurb_item_activity after insert or update or delete on public.refurb_item
  for each row execute function public.log_activity();

-- RLS
alter table public.deal enable row level security;
alter table public.deal_input enable row level security;
alter table public.refurb_item enable row level security;
alter table public.deal_analysis_cache enable row level security;
revoke all on public.deal, public.deal_input, public.refurb_item, public.deal_analysis_cache from anon;

create policy "members manage deals" on public.deal
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members read inputs" on public.deal_input
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members write agreed inputs and own proposals" on public.deal_input
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and (scope = 'agreed' or user_id = (select auth.uid())));
create policy "members update agreed inputs and own proposals" on public.deal_input
  for update to authenticated
  using (public.is_workspace_member(workspace_id) and (scope = 'agreed' or user_id = (select auth.uid())))
  with check (public.is_workspace_member(workspace_id) and (scope = 'agreed' or user_id = (select auth.uid())));
create policy "members delete agreed inputs and own proposals" on public.deal_input
  for delete to authenticated
  using (public.is_workspace_member(workspace_id) and (scope = 'agreed' or user_id = (select auth.uid())));

create policy "members manage refurb items" on public.refurb_item
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members manage analysis cache" on public.deal_analysis_cache
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
