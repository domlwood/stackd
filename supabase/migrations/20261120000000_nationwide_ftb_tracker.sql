-- Lean into the first-time buyer residential route: the Nationwide FTB 2-year
-- tracker (fee-free, 95% LTV) becomes the residential product, replacing the
-- placeholder fix. Cash, bridging and BTL products are left as they are.
-- Terms from Nationwide's intermediary guide effective 10 Nov 2026 (checked 15 Nov 2026).

insert into public.finance_product (
  workspace_id, type, lender, name,
  rate, rate_type, fixed_months, term_months, repayment,
  arrangement_fee_kind, arrangement_fee_pence, arrangement_fee_pct,
  fee_added_to_loan, broker_fee_pence, valuation_fee_pence, max_ltv,
  notes, last_reviewed_at
)
select
  w.id, 'residential', 'Nationwide', 'FTB 2-year tracker, fee-free, 95% LTV',
  0.0524, 'tracker', null, 300, 'repayment',
  'fixed', 0, 0,
  false, 0, 0, 0.95,
  'Bank Rate 4.00% + 1.24% for 2 years. No fee, no ERC, no exit fee, free standard valuation. £500 cashback on completion (not modelled). First-time buyers only (no mortgage in the last 3 years). New-build flats capped at 85% LTV. Terms from Nationwide''s intermediary guide effective 10 Nov 2026; confirm the current ESIS before applying.',
  timestamptz '2026-11-15 12:00:00+00'
from public.workspace w
where not exists (
  select 1 from public.finance_product p
  where p.workspace_id = w.id
    and p.lender = 'Nationwide'
    and p.name = 'FTB 2-year tracker, fee-free, 95% LTV'
);

-- Archive the placeholder residential fix. Deals that already use it keep
-- loading it (archived products a deal references are still served).
update public.finance_product
set archived_at = now(), updated_at = now()
where type = 'residential'
  and lender = 'Example Building Society'
  and name = '2-year fix, 75% LTV'
  and archived_at is null;

-- The product is a 95% LTV deal, so default new deals to a 5% deposit
-- (only where the workspace still has the previous 90% default).
update public.workspace_settings
set defaults = jsonb_set(defaults, '{finance,purchaseLtv}', '0.95'::jsonb)
where (defaults #>> '{finance,purchaseLtv}')::numeric = 0.9;
