-- Pipeline summaries and committed cash are computed live from inputs (cheap, never stale),
-- so the derived cache table is unnecessary.
drop table if exists public.deal_analysis_cache;
