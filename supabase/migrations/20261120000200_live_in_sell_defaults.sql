-- Live in & sell: the costed route is a ~9-month hold (3 months refurb + 6 to
-- sell), not 7. Only moves workspaces still on the old 4-month default.
update public.workspace_settings
set defaults = jsonb_set(defaults, '{flip,monthsToSell}', '6'::jsonb)
where (defaults #>> '{flip,monthsToSell}')::numeric = 4;
