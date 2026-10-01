-- Tighten the earlier broad discovery policy so private profiles cannot
-- expose their open trips through the discovery API.
drop policy if exists "trips_discover_authenticated" on public.trips;
drop policy if exists "travel_posts_public_select" on public.travel_posts;

-- The phase 6 policies remain the source of truth:
-- trips_select_open_discoverable
-- travel_posts_select_discoverable
