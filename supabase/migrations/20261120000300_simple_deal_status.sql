-- Status records your decision only (the verdict covers how good a deal is):
-- active · passed · bought. Every in-play status becomes active. Buying power
-- no longer holds cash back for offers, so nothing else depends on the old values.
alter table public.deal drop constraint if exists deal_status_check;

update public.deal
set status = 'active'
where status in ('lead', 'analysing', 'viewing', 'offer', 'accepted');

alter table public.deal
  add constraint deal_status_check check (status in ('active', 'passed', 'bought')),
  alter column status set default 'active';
