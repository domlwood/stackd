-- Every workspace gets a settings row, so the Settings page can always save,
-- and two placeholder mortgages, so new deals aren't analysed as cash purchases.
-- Empty JSON means "use the app's defaults" (first-time buyers, 95% LTV, …).
-- Workspaces made by `user:create` (without `seed`) previously had no row:
-- reads fell back to the defaults, but saving updated nothing.

insert into public.workspace_settings (workspace_id)
select w.id
from public.workspace w
where not exists (
  select 1 from public.workspace_settings s where s.workspace_id = w.id
);

-- Basic placeholder products: clearly not real quotes. Residential first (new
-- deals prefer it, and it matches the default 95% LTV); BTL for BRR refinancing.
create or replace function public.add_default_products(p_workspace uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.finance_product (
    workspace_id, type, lender, name,
    rate, rate_type, term_months, repayment, max_ltv,
    stress_rate, icr_threshold, min_months_owned_for_revaluation, notes
  ) values
  (
    p_workspace, 'residential', 'Example lender', 'Residential, 95% LTV',
    0.055, 'tracker', 300, 'repayment', 0.95,
    null, null, null,
    'Placeholder terms, not a real quote. No fees or early repayment charges. Replace it with a product from your lender or broker.'
  ),
  (
    p_workspace, 'btl', 'Example lender', 'Buy-to-let, 75% LTV',
    0.055, 'tracker', 300, 'interest_only', 0.75,
    0.055, 1.25, 6,
    'Placeholder terms, not a real quote. Stress-tested at 125% of interest at 5.5%; refinance after 6 months owned. Replace it with a product from your lender or broker.'
  );
$$;

revoke all on function public.add_default_products(uuid) from public, anon, authenticated;

-- Workspaces with no products at all get the placeholders (yours keeps what it has).
select public.add_default_products(w.id)
from public.workspace w
where not exists (
  select 1 from public.finance_product p where p.workspace_id = w.id
);

create or replace function public.create_workspace_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_settings (workspace_id)
  values (new.id)
  on conflict (workspace_id) do nothing;
  perform public.add_default_products(new.id);
  return new;
end;
$$;

revoke all on function public.create_workspace_settings() from public, anon, authenticated;

create trigger workspace_settings_on_create after insert on public.workspace
  for each row execute function public.create_workspace_settings();
