-- Rate limiting for public/edge endpoints (F2/F3).
-- Fixed-window counter shared across serverless instances. Called server-side
-- via the service-role client (see src/lib/rate-limit.ts). APPLY THIS in the
-- Supabase SQL editor — until then the helper fails open (allows traffic).

create table if not exists public.rate_limits (
  bucket        text        not null,
  identifier    text        not null,
  window_start  timestamptz not null,
  count         integer     not null default 0,
  primary key (bucket, identifier, window_start)
);

-- Old windows are dead weight; index for cheap cleanup.
create index if not exists rate_limits_window_idx on public.rate_limits (window_start);

-- Atomically increments the current fixed window's counter and returns whether
-- the request is still within budget (count <= p_max).
create or replace function public.check_rate_limit(
  p_bucket text,
  p_identifier text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count integer;
begin
  insert into public.rate_limits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window, 1)
  on conflict (bucket, identifier, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- RLS on the table; the function is security-definer and the app calls it via
-- the service role, so no direct table grants to anon/authenticated are needed.
alter table public.rate_limits enable row level security;
