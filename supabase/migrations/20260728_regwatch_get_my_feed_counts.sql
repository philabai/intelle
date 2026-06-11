-- ===========================================================================
-- RegWatch — get_my_feed_counts: server-side aggregation for the feed badges
-- ---------------------------------------------------------------------------
-- getMyFeedCounts() used to SELECT every footprint_matches row (+ a join) and
-- count them in JS — the heaviest query on the dashboard + feed landing. This
-- replaces it with a single aggregation (FILTER counts) so it's one round-trip,
-- no row transfer. SECURITY INVOKER (default for SQL functions) → footprint_
-- matches RLS scopes the counts to the caller's org.
--
-- The code keeps the old row-scan as a fallback, so this works before AND after
-- the migration is applied.
-- ===========================================================================

drop function if exists regwatch.get_my_feed_counts();

create or replace function regwatch.get_my_feed_counts()
returns table (
  total     int,
  unseen    int,
  critical  int,
  high      int,
  normal    int,
  low       int,
  resolved  int,
  hits_30d  int,
  hits_60d  int,
  hits_90d  int
)
language sql
stable
set search_path = regwatch, public
as $$
  with m as (
    select
      fm.severity,
      fm.resolved_at,
      fm.seen_at,
      coalesce(ri.consultation_closes_at::date, ri.effective_date::date) as deadline
    from regwatch.footprint_matches fm
    join regwatch.regulatory_items ri on ri.id = fm.regulatory_item_id
  )
  select
    count(*)::int,
    count(*) filter (where resolved_at is null and seen_at is null)::int,
    count(*) filter (where resolved_at is null and severity = 'critical')::int,
    count(*) filter (where resolved_at is null and severity = 'high')::int,
    count(*) filter (where resolved_at is null and severity = 'normal')::int,
    count(*) filter (where resolved_at is null and severity not in ('critical','high','normal'))::int,
    count(*) filter (where resolved_at is not null)::int,
    count(*) filter (where deadline is not null and deadline >= current_date and deadline <= current_date + 30)::int,
    count(*) filter (where deadline is not null and deadline >= current_date and deadline <= current_date + 60)::int,
    count(*) filter (where deadline is not null and deadline >= current_date and deadline <= current_date + 90)::int
  from m;
$$;

grant execute on function regwatch.get_my_feed_counts() to authenticated;

comment on function regwatch.get_my_feed_counts() is
  'Org-scoped (SECURITY INVOKER → RLS) aggregation of footprint_matches into the FeedCounts shape (total/unseen/severity buckets/resolved + 30/60/90-day deadline counts). One round-trip; replaces the JS row-scan.';
