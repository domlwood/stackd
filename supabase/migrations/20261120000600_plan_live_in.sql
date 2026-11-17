-- The plan picker (live in & sell / flip / BRR) is replaced by one switch:
-- "Buying as your home" (plan.liveIn). Both exits are now always analysed.
-- Carry over explicit choices; a BRR choice meant "compare both", which is
-- now the default, so it's dropped and the deal falls back to its default.
-- A data fix, not a change anyone made: keep it out of the activity feed.

alter table public.deal_input disable trigger deal_input_activity;

delete from public.deal_input
where key = 'plan.strategy'
  and value = '"brr"'::jsonb;

update public.deal_input
set key = 'plan.liveIn',
    value = case when value = '"live_in_sell"'::jsonb then 'true'::jsonb else 'false'::jsonb end
where key = 'plan.strategy';

alter table public.deal_input enable trigger deal_input_activity;
