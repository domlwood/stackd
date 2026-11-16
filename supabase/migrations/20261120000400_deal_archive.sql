-- Archive: hide a deal from the Deals page whatever its verdict or status
-- (it sold, or you're just not interested). Separate from Passed, which
-- records a decision and its reason. Restoring clears it.
alter table public.deal add column archived_at timestamptz;
