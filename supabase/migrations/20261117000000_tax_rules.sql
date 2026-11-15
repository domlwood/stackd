-- Versioned tax rules (SDLT, income tax, CGT, corporation tax, VAT). Data, not code.
-- Global rows (workspace_id null) are the verified seed; a workspace edit inserts
-- a new version for that workspace. Rows are immutable.

create table public.tax_rule_set (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspace (id) on delete cascade,
  kind text not null check (kind in ('sdlt', 'income_tax', 'cgt', 'corp_tax', 'vat')),
  jurisdiction text not null default 'england_ni',
  effective_from date not null,
  effective_to date,
  data jsonb not null,
  source_url text,
  verified_at timestamptz,
  note text,
  created_by uuid references public.profile (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint tax_rule_dates check (effective_to is null or effective_to >= effective_from)
);

create unique index tax_rule_set_global_unique on public.tax_rule_set (kind, jurisdiction, effective_from) where workspace_id is null;
create index tax_rule_set_lookup on public.tax_rule_set (kind, effective_from desc);

-- Global rows have no workspace: skip activity logging for them.
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
  if v_workspace is null then
    return null;
  end if;
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

create trigger tax_rule_set_activity after insert on public.tax_rule_set
  for each row execute function public.log_activity();

alter table public.tax_rule_set enable row level security;
revoke all on public.tax_rule_set from anon;
revoke update, delete, truncate on public.tax_rule_set from authenticated;

create policy "read global and own workspace rules" on public.tax_rule_set
  for select to authenticated
  using (workspace_id is null or public.is_workspace_member(workspace_id));

create policy "members add workspace rule versions" on public.tax_rule_set
  for insert to authenticated
  with check (workspace_id is not null and public.is_workspace_member(workspace_id));
