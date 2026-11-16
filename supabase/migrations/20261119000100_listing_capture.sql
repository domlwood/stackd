-- Listing capture: raw snapshots (Storage) + parsed fields, and listing photos on deals.

alter table public.deal add column photo_urls text[] not null default '{}';

create table public.listing_snapshot (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  deal_id uuid references public.deal (id) on delete set null,
  provider text not null check (provider in ('rightmove', 'manual')),
  provider_ref text,
  source_url text not null check (length(source_url) <= 2000),
  status text not null check (status in ('ok', 'partial', 'failed')),
  parsed jsonb not null default '{}'::jsonb,
  raw_path text,
  error text,
  fetched_at timestamptz not null default now(),
  created_by uuid references public.profile (id) on delete set null default auth.uid()
);

create index listing_snapshot_lookup on public.listing_snapshot (workspace_id, provider, provider_ref, fetched_at desc);
create index listing_snapshot_deal on public.listing_snapshot (deal_id) where deal_id is not null;

alter table public.listing_snapshot enable row level security;
revoke all on public.listing_snapshot from anon;
create policy "members manage snapshots" on public.listing_snapshot
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Private bucket for raw HTML snapshots; objects live under "<workspace_id>/...".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-snapshots', 'listing-snapshots', false, 10485760, array['application/gzip', 'text/html'])
on conflict (id) do nothing;

create policy "members read snapshot files" on storage.objects
  for select to authenticated
  using (bucket_id = 'listing-snapshots' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));

create policy "members upload snapshot files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-snapshots' and public.is_workspace_member(((storage.foldername(name))[1])::uuid));
