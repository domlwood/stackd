-- Finance: fund pots, finance product library, ERC schedules.
-- Money = bigint pence. Rates/percentages = numeric fractions (0.055 = 5.5%).

-- ---------------------------------------------------------------------------
-- Fund pots: named cash sources
-- ---------------------------------------------------------------------------

create table public.fund_pot (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  owner_user_id uuid not null references public.profile (id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 80),
  kind text not null default 'savings' check (kind in ('savings', 'partner', 'equity_release', 'loan', 'other')),
  amount_pence bigint not null check (amount_pence >= 0),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fund_pot_workspace_idx on public.fund_pot (workspace_id);

-- ---------------------------------------------------------------------------
-- Finance products
-- ---------------------------------------------------------------------------

create table public.finance_product (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  type text not null check (type in ('cash', 'bridging', 'residential', 'btl')),
  lender text not null check (length(trim(lender)) between 1 and 80),
  name text not null check (length(trim(name)) between 1 and 120),

  -- Mortgage terms (residential / btl)
  rate numeric(9, 6) check (rate is null or rate between 0 and 1),
  rate_type text check (rate_type is null or rate_type in ('fixed', 'tracker')),
  fixed_months integer check (fixed_months is null or fixed_months between 0 and 600),
  term_months integer check (term_months is null or term_months between 1 and 600),
  repayment text check (repayment is null or repayment in ('repayment', 'interest_only')),

  -- Fees (all types)
  arrangement_fee_kind text not null default 'fixed' check (arrangement_fee_kind in ('fixed', 'pct')),
  arrangement_fee_pence bigint not null default 0 check (arrangement_fee_pence >= 0),
  arrangement_fee_pct numeric(9, 6) not null default 0 check (arrangement_fee_pct between 0 and 1),
  fee_added_to_loan boolean not null default false,
  broker_fee_pence bigint not null default 0 check (broker_fee_pence >= 0),
  valuation_fee_pence bigint not null default 0 check (valuation_fee_pence >= 0),
  max_ltv numeric(9, 6) check (max_ltv is null or max_ltv between 0 and 1),

  -- Bridging
  monthly_rate numeric(9, 6) check (monthly_rate is null or monthly_rate between 0 and 1),
  interest_mode text check (interest_mode is null or interest_mode in ('retained', 'serviced', 'rolled')),
  min_term_months integer check (min_term_months is null or min_term_months between 0 and 60),
  exit_fee_pct numeric(9, 6) check (exit_fee_pct is null or exit_fee_pct between 0 and 1),

  -- BTL affordability
  stress_rate numeric(9, 6) check (stress_rate is null or stress_rate between 0 and 1),
  icr_threshold numeric(9, 6) check (icr_threshold is null or icr_threshold between 0 and 5),
  min_months_owned_for_revaluation integer check (
    min_months_owned_for_revaluation is null or min_months_owned_for_revaluation between 0 and 60
  ),

  notes text check (notes is null or length(notes) <= 2000),
  last_reviewed_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by uuid references public.profile (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Type-specific required fields (zod is the primary validator; these are the backstop)
  constraint mortgage_terms_required check (
    type not in ('residential', 'btl')
    or (rate is not null and rate_type is not null and term_months is not null and repayment is not null and max_ltv is not null)
  ),
  constraint bridging_terms_required check (
    type <> 'bridging'
    or (monthly_rate is not null and interest_mode is not null and max_ltv is not null and exit_fee_pct is not null)
  ),
  constraint btl_affordability_required check (
    type <> 'btl' or (stress_rate is not null and icr_threshold is not null)
  )
);

create index finance_product_workspace_idx on public.finance_product (workspace_id, type) where archived_at is null;

-- ERC schedule: ordered, contiguous month bands. [from_month, to_month)
create table public.erc_band (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspace (id) on delete cascade,
  product_id uuid not null references public.finance_product (id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  from_month integer not null check (from_month >= 0),
  to_month integer not null,
  pct numeric(9, 6) not null check (pct between 0 and 1),
  constraint erc_band_month_order check (to_month > from_month),
  unique (product_id, ordinal)
);

create index erc_band_product_idx on public.erc_band (product_id, ordinal);

-- Bands must belong to the same workspace as their product.
create or replace function public.erc_band_workspace_matches()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.workspace_id is distinct from (select p.workspace_id from public.finance_product p where p.id = new.product_id) then
    raise exception 'erc_band workspace must match its product';
  end if;
  return new;
end;
$$;

create trigger erc_band_workspace_check before insert or update on public.erc_band
  for each row execute function public.erc_band_workspace_matches();

-- ---------------------------------------------------------------------------
-- save_finance_product: atomic upsert of a product and its ERC schedule.
-- SECURITY INVOKER, so RLS applies to every statement. ERC changes are logged
-- as one semantic event (old -> new schedule) rather than per-band noise.
-- ---------------------------------------------------------------------------

create or replace function public.save_finance_product(p_product jsonb, p_bands jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_product ->> 'id', '')::uuid;
  v_workspace uuid := (p_product ->> 'workspace_id')::uuid;
  v_row public.finance_product;
  v_old_bands jsonb;
  v_new_bands jsonb;
begin
  if not public.is_workspace_member(v_workspace) then
    raise exception 'not a member of this workspace' using errcode = '42501';
  end if;

  v_row := jsonb_populate_record(null::public.finance_product, p_product);

  if v_id is null then
    insert into public.finance_product (
      workspace_id, type, lender, name, rate, rate_type, fixed_months, term_months, repayment,
      arrangement_fee_kind, arrangement_fee_pence, arrangement_fee_pct, fee_added_to_loan,
      broker_fee_pence, valuation_fee_pence, max_ltv, monthly_rate, interest_mode, min_term_months,
      exit_fee_pct, stress_rate, icr_threshold, min_months_owned_for_revaluation, notes
    ) values (
      v_workspace, v_row.type, v_row.lender, v_row.name, v_row.rate, v_row.rate_type, v_row.fixed_months,
      v_row.term_months, v_row.repayment, coalesce(v_row.arrangement_fee_kind, 'fixed'),
      coalesce(v_row.arrangement_fee_pence, 0), coalesce(v_row.arrangement_fee_pct, 0),
      coalesce(v_row.fee_added_to_loan, false), coalesce(v_row.broker_fee_pence, 0),
      coalesce(v_row.valuation_fee_pence, 0), v_row.max_ltv, v_row.monthly_rate, v_row.interest_mode,
      v_row.min_term_months, v_row.exit_fee_pct, v_row.stress_rate, v_row.icr_threshold,
      v_row.min_months_owned_for_revaluation, v_row.notes
    )
    returning id into v_id;
    v_old_bands := '[]'::jsonb;
  else
    update public.finance_product set
      type = v_row.type,
      lender = v_row.lender,
      name = v_row.name,
      rate = v_row.rate,
      rate_type = v_row.rate_type,
      fixed_months = v_row.fixed_months,
      term_months = v_row.term_months,
      repayment = v_row.repayment,
      arrangement_fee_kind = coalesce(v_row.arrangement_fee_kind, 'fixed'),
      arrangement_fee_pence = coalesce(v_row.arrangement_fee_pence, 0),
      arrangement_fee_pct = coalesce(v_row.arrangement_fee_pct, 0),
      fee_added_to_loan = coalesce(v_row.fee_added_to_loan, false),
      broker_fee_pence = coalesce(v_row.broker_fee_pence, 0),
      valuation_fee_pence = coalesce(v_row.valuation_fee_pence, 0),
      max_ltv = v_row.max_ltv,
      monthly_rate = v_row.monthly_rate,
      interest_mode = v_row.interest_mode,
      min_term_months = v_row.min_term_months,
      exit_fee_pct = v_row.exit_fee_pct,
      stress_rate = v_row.stress_rate,
      icr_threshold = v_row.icr_threshold,
      min_months_owned_for_revaluation = v_row.min_months_owned_for_revaluation,
      notes = v_row.notes
    where id = v_id and workspace_id = v_workspace;

    if not found then
      raise exception 'finance product not found' using errcode = 'P0002';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('from_month', from_month, 'to_month', to_month, 'pct', pct) order by ordinal), '[]'::jsonb)
      into v_old_bands
      from public.erc_band where product_id = v_id;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
      'from_month', (b ->> 'from_month')::integer,
      'to_month', (b ->> 'to_month')::integer,
      'pct', (b ->> 'pct')::numeric
    ) order by ord), '[]'::jsonb)
    into v_new_bands
    from jsonb_array_elements(coalesce(p_bands, '[]'::jsonb)) with ordinality as t (b, ord);

  if v_old_bands is distinct from v_new_bands then
    delete from public.erc_band where product_id = v_id;
    insert into public.erc_band (workspace_id, product_id, ordinal, from_month, to_month, pct)
    select v_workspace, v_id, (ord - 1)::integer, (b ->> 'from_month')::integer, (b ->> 'to_month')::integer, (b ->> 'pct')::numeric
    from jsonb_array_elements(coalesce(p_bands, '[]'::jsonb)) with ordinality as t (b, ord);

    perform public.log_event(
      v_workspace, null, 'finance_product', v_id::text, 'erc_schedule',
      jsonb_build_object('old', v_old_bands, 'new', v_new_bands)
    );
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_finance_product(jsonb, jsonb) from public, anon;
grant execute on function public.save_finance_product(jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers: updated_at + activity log
-- ---------------------------------------------------------------------------

create trigger fund_pot_updated_at before update on public.fund_pot
  for each row execute function public.set_updated_at();
create trigger finance_product_updated_at before update on public.finance_product
  for each row execute function public.set_updated_at();

create trigger fund_pot_activity after insert or update or delete on public.fund_pot
  for each row execute function public.log_activity();
create trigger finance_product_activity after insert or update or delete on public.finance_product
  for each row execute function public.log_activity();
-- erc_band is logged by save_finance_product() as a single schedule event.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.fund_pot enable row level security;
alter table public.finance_product enable row level security;
alter table public.erc_band enable row level security;

revoke all on public.fund_pot, public.finance_product, public.erc_band from anon;

create policy "members manage fund pots" on public.fund_pot
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id) and public.shares_workspace_with(owner_user_id));

create policy "members manage finance products" on public.finance_product
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

create policy "members manage erc bands" on public.erc_band
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
