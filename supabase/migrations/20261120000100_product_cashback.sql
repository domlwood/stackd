-- Lender cashback paid on completion (e.g. Nationwide's £500 for first-time
-- buyers). The engine nets it off the cash a deal ties up.

alter table public.finance_product
  add column cashback_pence bigint not null default 0 check (cashback_pence >= 0);

-- save_finance_product lists columns explicitly, so it must learn the new one.
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
      exit_fee_pct, stress_rate, icr_threshold, min_months_owned_for_revaluation, notes, cashback_pence
    ) values (
      v_workspace, v_row.type, v_row.lender, v_row.name, v_row.rate, v_row.rate_type, v_row.fixed_months,
      v_row.term_months, v_row.repayment, coalesce(v_row.arrangement_fee_kind, 'fixed'),
      coalesce(v_row.arrangement_fee_pence, 0), coalesce(v_row.arrangement_fee_pct, 0),
      coalesce(v_row.fee_added_to_loan, false), coalesce(v_row.broker_fee_pence, 0),
      coalesce(v_row.valuation_fee_pence, 0), v_row.max_ltv, v_row.monthly_rate, v_row.interest_mode,
      v_row.min_term_months, v_row.exit_fee_pct, v_row.stress_rate, v_row.icr_threshold,
      v_row.min_months_owned_for_revaluation, v_row.notes, coalesce(v_row.cashback_pence, 0)
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
      notes = v_row.notes,
      cashback_pence = coalesce(v_row.cashback_pence, 0)
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

update public.finance_product
set cashback_pence = 50000,
    notes = replace(notes, '£500 cashback on completion (not modelled).', '£500 cashback on completion.')
where lender = 'Nationwide'
  and name = 'FTB 2-year tracker, fee-free, 95% LTV';
