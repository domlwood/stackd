-- Stamp duty is now set by one "buying situation" input (buyer.situation)
-- instead of two tick boxes (buyer.firstTimeBuyer, buyer.additionalProperty).
-- Convert any saved tick boxes per deal and view (agreed, or a member's
-- proposal):
--   additional property ticked      → 'additional'
--   first-time buyer ticked         → 'first_home'
--   anything else (both unticked)   → dropped; the deal uses its default
-- A data fix, not a change anyone made: keep it out of the activity feed.

alter table public.deal_input disable trigger deal_input_activity;

insert into public.deal_input (workspace_id, deal_id, key, scope, user_id, value)
select workspace_id, deal_id, 'buyer.situation', scope, user_id,
  case
    when bool_or(key = 'buyer.additionalProperty' and value = 'true'::jsonb) then '"additional"'::jsonb
    else '"first_home"'::jsonb
  end
from public.deal_input
where key in ('buyer.firstTimeBuyer', 'buyer.additionalProperty')
group by workspace_id, deal_id, scope, user_id
having bool_or(key = 'buyer.additionalProperty' and value = 'true'::jsonb)
    or bool_or(key = 'buyer.firstTimeBuyer' and value = 'true'::jsonb)
on conflict do nothing;

delete from public.deal_input
where key in ('buyer.firstTimeBuyer', 'buyer.additionalProperty');

alter table public.deal_input enable trigger deal_input_activity;
