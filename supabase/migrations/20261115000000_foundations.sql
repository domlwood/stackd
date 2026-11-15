-- Foundations: workspaces, membership, profiles, settings, activity log.
-- Conventions: money = bigint pence; rates = numeric fractions; timestamps = timestamptz (UTC).
-- Every workspace-scoped table has RLS enabled and policies based on is_workspace_member().

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Workspaces and membership
-- ---------------------------------------------------------------------------

create table public.workspace (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_member (
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  user_id uuid not null references public.profile (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_member_user_idx on public.workspace_member (user_id);

-- Membership check used by every RLS policy. SECURITY DEFINER so it can read
-- workspace_member without recursing through that table's own policies.
create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_member m
    where m.workspace_id = target_workspace
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

-- True when the current user shares any workspace with target_user.
create or replace function public.shares_workspace_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_member mine
    join public.workspace_member theirs on theirs.workspace_id = mine.workspace_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = target_user
  );
$$;

revoke all on function public.shares_workspace_with(uuid) from public, anon;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

-- Profile row is created automatically for every auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Workspace settings (buy box + default assumptions). Shape validated by zod
-- in the app (features/settings/schemas.ts); stored as jsonb so new
-- assumptions don't need migrations.
-- ---------------------------------------------------------------------------

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspace (id) on delete cascade,
  buy_box jsonb not null default '{}'::jsonb,
  defaults jsonb not null default '{}'::jsonb,
  stale_after_days integer not null default 90 check (stale_after_days between 1 and 3650),
  buyer_entity text not null default 'personal' check (buyer_entity in ('personal', 'ltd')),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activity log: append-only. Rows are written by the log_activity() trigger
-- attached to every audited table, so no write path can bypass it.
-- ---------------------------------------------------------------------------

create table public.activity_event (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  deal_id uuid,
  actor_id uuid references public.profile (id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'event')),
  entity_type text not null,
  entity_id text not null,
  field text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index activity_event_workspace_idx on public.activity_event (workspace_id, created_at desc);
create index activity_event_deal_idx on public.activity_event (deal_id, created_at desc) where deal_id is not null;

create or replace function public.prevent_activity_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'activity_event is append-only';
end;
$$;

create trigger activity_event_append_only
  before update or delete on public.activity_event
  for each row execute function public.prevent_activity_mutation();

-- Columns never logged as field-level changes.
create or replace function public.activity_ignored_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['updated_at', 'created_at', 'workspace_id', 'id']::text[];
$$;

-- Generic audit trigger. Expects the audited table to have id + workspace_id;
-- deal_id is taken from a deal_id column if present (or id for the deal table).
create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  row_data jsonb := coalesce(new_row, old_row);
  v_workspace uuid := (row_data ->> 'workspace_id')::uuid;
  v_entity_id text := coalesce(row_data ->> 'id', row_data ->> 'deal_id', '');
  v_deal uuid := case
    when tg_table_name = 'deal' then (row_data ->> 'id')::uuid
    else (row_data ->> 'deal_id')::uuid
  end;
  v_actor uuid := (select auth.uid());
  col text;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, new_value)
    values (v_workspace, v_deal, v_actor, 'create', tg_table_name, v_entity_id, new_row);
  elsif tg_op = 'DELETE' then
    insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, old_value)
    values (v_workspace, v_deal, v_actor, 'delete', tg_table_name, v_entity_id, old_row);
  else
    for col in select jsonb_object_keys(new_row) loop
      if col = any (public.activity_ignored_columns()) then
        continue;
      end if;
      if (old_row -> col) is distinct from (new_row -> col) then
        insert into public.activity_event
          (workspace_id, deal_id, actor_id, action, entity_type, entity_id, field, old_value, new_value)
        values
          (v_workspace, v_deal, v_actor, 'update', tg_table_name, v_entity_id, col, old_row -> col, new_row -> col);
      end if;
    end loop;
  end if;
  return null;
end;
$$;

-- Semantic events that are not plain row changes (e.g. "proposal accepted").
create or replace function public.log_event(
  p_workspace uuid,
  p_deal uuid,
  p_entity_type text,
  p_entity_id text,
  p_field text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_workspace_member(p_workspace) then
    raise exception 'not a member of this workspace' using errcode = '42501';
  end if;
  insert into public.activity_event (workspace_id, deal_id, actor_id, action, entity_type, entity_id, field, new_value)
  values (p_workspace, p_deal, (select auth.uid()), 'event', p_entity_type, p_entity_id, p_field, p_payload);
end;
$$;

revoke all on function public.log_event(uuid, uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.log_event(uuid, uuid, text, text, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger workspace_updated_at before update on public.workspace
  for each row execute function public.set_updated_at();
create trigger profile_updated_at before update on public.profile
  for each row execute function public.set_updated_at();
create trigger workspace_settings_updated_at before update on public.workspace_settings
  for each row execute function public.set_updated_at();

-- workspace_settings has no id column; entity_id falls back to ''. Use workspace_id instead.
create or replace function public.log_settings_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  col text;
begin
  for col in select jsonb_object_keys(new_row) loop
    if col = any (public.activity_ignored_columns()) then
      continue;
    end if;
    if (old_row -> col) is distinct from (new_row -> col) then
      insert into public.activity_event
        (workspace_id, actor_id, action, entity_type, entity_id, field, old_value, new_value)
      values
        (new.workspace_id, (select auth.uid()), 'update', 'workspace_settings', new.workspace_id::text, col, old_row -> col, new_row -> col);
    end if;
  end loop;
  return null;
end;
$$;

create trigger workspace_settings_activity after update on public.workspace_settings
  for each row execute function public.log_settings_activity();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workspace enable row level security;
alter table public.profile enable row level security;
alter table public.workspace_member enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.activity_event enable row level security;

-- Anonymous visitors get nothing from any table (the share pack uses a
-- dedicated SECURITY DEFINER RPC added in a later migration).
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

create policy "members read workspace" on public.workspace
  for select to authenticated using (public.is_workspace_member(id));
create policy "members rename workspace" on public.workspace
  for update to authenticated using (public.is_workspace_member(id)) with check (public.is_workspace_member(id));

create policy "read own and co-member profiles" on public.profile
  for select to authenticated using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "update own profile" on public.profile
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "members read membership" on public.workspace_member
  for select to authenticated using (public.is_workspace_member(workspace_id));
-- No insert/update/delete policies: membership is managed by the service role (seed / user:create).

create policy "members read settings" on public.workspace_settings
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy "members update settings" on public.workspace_settings
  for update to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members read activity" on public.activity_event
  for select to authenticated using (public.is_workspace_member(workspace_id));
-- No write policies: rows only arrive via log_activity()/log_event() (SECURITY DEFINER).
revoke insert, update, delete, truncate on public.activity_event from authenticated;
