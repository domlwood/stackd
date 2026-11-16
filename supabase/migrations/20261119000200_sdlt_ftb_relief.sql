-- Completes the global SDLT rule set with first-time buyer relief (verified gov.uk 2026-11-15):
-- no SDLT up to £300,000; 5% on £300,001–£500,000; no relief above £500,000.
update public.tax_rule_set
set data = data || jsonb_build_object(
  'firstTimeBuyer', jsonb_build_object('nilRateUptoPence', 30000000, 'rate', 0.05, 'maxPricePence', 50000000)
)
where workspace_id is null and kind = 'sdlt' and not (data ? 'firstTimeBuyer');
